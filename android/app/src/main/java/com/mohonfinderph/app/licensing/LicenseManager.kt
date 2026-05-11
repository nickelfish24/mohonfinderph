package com.mohonfinderph.app.licensing

import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.firebase.Timestamp
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.Source
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import kotlin.math.ceil

data class LicenseCheckResult(
    val ok: Boolean,
    val isLicensed: Boolean,
    val reasonCode: String,
    val message: String,
    val licenseKeyMasked: String?,
    val expiryDateMs: Long?,
    val remainingDays: Long?,
    val source: String,
    val deviceId: String,
    val checkedAtServerMs: Long?,
    val usedOfflineFallback: Boolean
)

private class LicenseFlowException(
    val reason: String,
    override val message: String
) : RuntimeException(message)

class LicenseManager(private val context: Context) {
    private val auth: FirebaseAuth? by lazy(LazyThreadSafetyMode.NONE) { createFirebaseAuth() }
    private val firestore: FirebaseFirestore? by lazy(LazyThreadSafetyMode.NONE) { createFirestore() }
    private val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun initializeAndRevalidate(): LicenseCheckResult {
        val cachedLicenseKey = getCachedLicenseKey()
        val deviceId = getDeviceId()
        if (cachedLicenseKey.isEmpty()) {
            return LicenseCheckResult(
                ok = true,
                isLicensed = false,
                reasonCode = "no-license",
                message = "No saved license yet.",
                licenseKeyMasked = null,
                expiryDateMs = null,
                remainingDays = null,
                source = "none",
                deviceId = deviceId,
                checkedAtServerMs = null,
                usedOfflineFallback = false
            )
        }
        return revalidateKey(cachedLicenseKey, allowOfflineFallback = true)
    }

    fun activateLicense(rawLicenseKey: String): LicenseCheckResult {
        val licenseKey = normalizeLicenseKey(rawLicenseKey)
        val deviceId = getDeviceId()

        if (licenseKey.isEmpty()) {
            return LicenseCheckResult(
                ok = false,
                isLicensed = false,
                reasonCode = "empty-license",
                message = "Please enter a license key.",
                licenseKeyMasked = null,
                expiryDateMs = null,
                remainingDays = null,
                source = "none",
                deviceId = deviceId,
                checkedAtServerMs = null,
                usedOfflineFallback = false
            )
        }

        try {
            val (authClient, firestoreClient) = requireFirebaseClients()
            val uid = ensureAuthenticatedUser(authClient)
            val serverNowMs = fetchServerNowMs(firestoreClient, uid)
            val licenseDoc = findLicenseDocumentByKey(firestoreClient, licenseKey)
                ?: return invalidLicenseResult("invalid-license", "Invalid license.", deviceId, licenseKey)

            val statusValue = normalizeStatus(licenseDoc.getString("status"))
            if (statusValue != "active") {
                clearCachedLicense()
                return LicenseCheckResult(
                    ok = false,
                    isLicensed = false,
                    reasonCode = "inactive",
                    message = "License is inactive.",
                    licenseKeyMasked = maskLicense(licenseKey),
                    expiryDateMs = extractExpiryMs(licenseDoc),
                    remainingDays = null,
                    source = "server",
                    deviceId = deviceId,
                    checkedAtServerMs = serverNowMs,
                    usedOfflineFallback = false
                )
            }

            val expiryMs = extractExpiryMs(licenseDoc)
                ?: return invalidLicenseResult(
                    "missing-expiry",
                    "License has no expiry date configured.",
                    deviceId,
                    licenseKey
                )

            if (expiryMs <= serverNowMs) {
                clearCachedLicense()
                return LicenseCheckResult(
                    ok = false,
                    isLicensed = false,
                    reasonCode = "expired",
                    message = "License expired.",
                    licenseKeyMasked = maskLicense(licenseKey),
                    expiryDateMs = expiryMs,
                    remainingDays = 0,
                    source = "server",
                    deviceId = deviceId,
                    checkedAtServerMs = serverNowMs,
                    usedOfflineFallback = false
                )
            }

            val validatedDeviceId = bindOrValidateDevice(
                firestore = firestoreClient,
                docRef = licenseDoc.reference,
                currentDeviceId = deviceId,
                serverNowMs = serverNowMs
            )

            saveCache(
                licenseKey = licenseKey,
                expiryDateMs = expiryMs,
                lastServerCheckMs = serverNowMs,
                elapsedRealtimeMs = SystemClock.elapsedRealtime(),
                deviceId = validatedDeviceId
            )

            return LicenseCheckResult(
                ok = true,
                isLicensed = true,
                reasonCode = "activated",
                message = "License activated.",
                licenseKeyMasked = maskLicense(licenseKey),
                expiryDateMs = expiryMs,
                remainingDays = calculateRemainingDays(expiryMs, serverNowMs),
                source = "server",
                deviceId = validatedDeviceId,
                checkedAtServerMs = serverNowMs,
                usedOfflineFallback = false
            )
        } catch (flowError: LicenseFlowException) {
            if (flowError.reason == "device-mismatch") {
                return LicenseCheckResult(
                    ok = false,
                    isLicensed = false,
                    reasonCode = "device-mismatch",
                    message = "License already used on another device.",
                    licenseKeyMasked = maskLicense(licenseKey),
                    expiryDateMs = getCachedExpiryDateMs(),
                    remainingDays = null,
                    source = "server",
                    deviceId = deviceId,
                    checkedAtServerMs = null,
                    usedOfflineFallback = false
                )
            }

            return invalidLicenseResult(
                flowError.reason,
                flowError.message,
                deviceId,
                licenseKey
            )
        } catch (error: Throwable) {
            return mapFirebaseErrorToResult(
                error = error,
                fallbackReason = "activation-error",
                fallbackMessage = "License activation failed.",
                deviceId = deviceId,
                licenseKey = licenseKey
            )
        }
    }

    fun revalidateSavedLicense(allowOfflineFallback: Boolean = true): LicenseCheckResult {
        val cachedLicenseKey = getCachedLicenseKey()
        if (cachedLicenseKey.isEmpty()) {
            clearCachedLicense()
            return LicenseCheckResult(
                ok = true,
                isLicensed = false,
                reasonCode = "no-license",
                message = "No saved license.",
                licenseKeyMasked = null,
                expiryDateMs = null,
                remainingDays = null,
                source = "none",
                deviceId = getDeviceId(),
                checkedAtServerMs = null,
                usedOfflineFallback = false
            )
        }
        return revalidateKey(cachedLicenseKey, allowOfflineFallback)
    }

    fun getCachedLicenseState(): LicenseCheckResult {
        val cachedLicenseKey = getCachedLicenseKey()
        val cachedExpiryMs = getCachedExpiryDateMs()
        val cachedServerCheckMs = preferences.getLong(PREF_LAST_SERVER_CHECK_MS, 0L).takeIf { it > 0L }
        val cachedDeviceId = preferences.getString(PREF_DEVICE_ID, "")?.trim().orEmpty()
        val deviceId = getDeviceId()
        val hasCachedLicense = cachedLicenseKey.isNotEmpty() && cachedExpiryMs != null
        val isSameDevice = cachedDeviceId.isNotEmpty() && cachedDeviceId == deviceId

        return LicenseCheckResult(
            ok = hasCachedLicense,
            isLicensed = hasCachedLicense && isSameDevice,
            reasonCode = if (hasCachedLicense) "cache-present" else "cache-empty",
            message = if (hasCachedLicense) "Cached license found." else "No cached license.",
            licenseKeyMasked = if (cachedLicenseKey.isNotEmpty()) maskLicense(cachedLicenseKey) else null,
            expiryDateMs = cachedExpiryMs,
            remainingDays = if (cachedExpiryMs != null && cachedServerCheckMs != null) {
                calculateRemainingDays(cachedExpiryMs, cachedServerCheckMs)
            } else {
                null
            },
            source = "cache",
            deviceId = deviceId,
            checkedAtServerMs = cachedServerCheckMs,
            usedOfflineFallback = false
        )
    }

    fun clearCachedLicense() {
        preferences.edit()
            .remove(PREF_LICENSE_KEY)
            .remove(PREF_EXPIRY_DATE_MS)
            .remove(PREF_LAST_SERVER_CHECK_MS)
            .remove(PREF_LAST_ELAPSED_REALTIME_MS)
            .remove(PREF_DEVICE_ID)
            .remove(PREF_BOOT_COUNT)
            .apply()
    }

    private fun revalidateKey(licenseKey: String, allowOfflineFallback: Boolean): LicenseCheckResult {
        val deviceId = getDeviceId()
        try {
            val (authClient, firestoreClient) = requireFirebaseClients()
            val uid = ensureAuthenticatedUser(authClient)
            val serverNowMs = fetchServerNowMs(firestoreClient, uid)
            val licenseDoc = findLicenseDocumentByKey(firestoreClient, licenseKey)
                ?: return invalidLicenseResult("invalid-license", "Invalid license.", deviceId, licenseKey)

            val statusValue = normalizeStatus(licenseDoc.getString("status"))
            if (statusValue != "active") {
                clearCachedLicense()
                return LicenseCheckResult(
                    ok = false,
                    isLicensed = false,
                    reasonCode = "inactive",
                    message = "License is inactive.",
                    licenseKeyMasked = maskLicense(licenseKey),
                    expiryDateMs = extractExpiryMs(licenseDoc),
                    remainingDays = null,
                    source = "server",
                    deviceId = deviceId,
                    checkedAtServerMs = serverNowMs,
                    usedOfflineFallback = false
                )
            }

            val expiryMs = extractExpiryMs(licenseDoc)
                ?: return invalidLicenseResult(
                    "missing-expiry",
                    "License has no expiry date configured.",
                    deviceId,
                    licenseKey
                )

            if (expiryMs <= serverNowMs) {
                clearCachedLicense()
                return LicenseCheckResult(
                    ok = false,
                    isLicensed = false,
                    reasonCode = "expired",
                    message = "License expired.",
                    licenseKeyMasked = maskLicense(licenseKey),
                    expiryDateMs = expiryMs,
                    remainingDays = 0,
                    source = "server",
                    deviceId = deviceId,
                    checkedAtServerMs = serverNowMs,
                    usedOfflineFallback = false
                )
            }

            val validatedDeviceId = bindOrValidateDevice(
                firestore = firestoreClient,
                docRef = licenseDoc.reference,
                currentDeviceId = deviceId,
                serverNowMs = serverNowMs
            )

            saveCache(
                licenseKey = licenseKey,
                expiryDateMs = expiryMs,
                lastServerCheckMs = serverNowMs,
                elapsedRealtimeMs = SystemClock.elapsedRealtime(),
                deviceId = validatedDeviceId
            )

            return LicenseCheckResult(
                ok = true,
                isLicensed = true,
                reasonCode = "valid",
                message = "License valid.",
                licenseKeyMasked = maskLicense(licenseKey),
                expiryDateMs = expiryMs,
                remainingDays = calculateRemainingDays(expiryMs, serverNowMs),
                source = "server",
                deviceId = validatedDeviceId,
                checkedAtServerMs = serverNowMs,
                usedOfflineFallback = false
            )
        } catch (flowError: LicenseFlowException) {
            if (flowError.reason == "device-mismatch") {
                clearCachedLicense()
                return LicenseCheckResult(
                    ok = false,
                    isLicensed = false,
                    reasonCode = "device-mismatch",
                    message = "License already used on another device.",
                    licenseKeyMasked = maskLicense(licenseKey),
                    expiryDateMs = null,
                    remainingDays = null,
                    source = "server",
                    deviceId = deviceId,
                    checkedAtServerMs = null,
                    usedOfflineFallback = false
                )
            }

            return invalidLicenseResult(
                flowError.reason,
                flowError.message,
                deviceId,
                licenseKey
            )
        } catch (error: Throwable) {
            if (allowOfflineFallback && isLikelyNetworkError(error)) {
                val fallback = buildOfflineFallback(licenseKey, deviceId, error.message.orEmpty())
                if (fallback != null) {
                    return fallback
                }
            }
            return mapFirebaseErrorToResult(
                error = error,
                fallbackReason = "revalidate-error",
                fallbackMessage = "Unable to revalidate license.",
                deviceId = deviceId,
                licenseKey = licenseKey
            )
        }
    }

    private fun ensureAuthenticatedUser(authClient: FirebaseAuth): String {
        val existingUser = authClient.currentUser
        if (existingUser != null) {
            return existingUser.uid
        }

        val authResult = awaitTask(authClient.signInAnonymously())
        return authResult.user?.uid
            ?: throw IllegalStateException("Unable to authenticate user.")
    }

    private fun findLicenseDocumentByKey(
        firestore: FirebaseFirestore,
        licenseKey: String
    ): DocumentSnapshot? {
        val result = awaitTask(
            firestore.collection(LICENSES_COLLECTION)
                .whereEqualTo("license_key", licenseKey)
                .limit(1)
                .get(Source.SERVER)
        )
        return result.documents.firstOrNull()
    }

    private fun fetchServerNowMs(
        firestore: FirebaseFirestore,
        uid: String
    ): Long {
        val clockRef = firestore.collection(SERVER_CLOCK_COLLECTION).document(uid)
        val payload = hashMapOf(
            "server_now" to FieldValue.serverTimestamp(),
            "updated_at" to FieldValue.serverTimestamp()
        )
        awaitTask(clockRef.set(payload, SetOptions.merge()))

        var snapshot = awaitTask(clockRef.get(Source.SERVER))
        var timestamp = snapshot.getTimestamp("server_now") ?: snapshot.getTimestamp("updated_at")
        if (timestamp == null) {
            Thread.sleep(150)
            snapshot = awaitTask(clockRef.get(Source.SERVER))
            timestamp = snapshot.getTimestamp("server_now") ?: snapshot.getTimestamp("updated_at")
        }

        return timestamp?.toDate()?.time
            ?: throw IllegalStateException("Unable to resolve trusted server time.")
    }

    private fun bindOrValidateDevice(
        firestore: FirebaseFirestore,
        docRef: DocumentReference,
        currentDeviceId: String,
        serverNowMs: Long
    ): String {
        return awaitTask(
            firestore.runTransaction { transaction ->
                val snapshot = transaction.get(docRef)
                val statusValue = normalizeStatus(snapshot.getString("status"))
                if (statusValue != "active") {
                    throw LicenseFlowException("inactive", "License is inactive.")
                }

                val expiryMs = extractExpiryMs(snapshot)
                    ?: throw LicenseFlowException("missing-expiry", "License expiry is missing.")

                if (expiryMs <= serverNowMs) {
                    throw LicenseFlowException("expired", "License expired.")
                }

                val storedDeviceId = snapshot.getString("device_id")?.trim().orEmpty()
                if (storedDeviceId.isEmpty()) {
                    transaction.update(
                        docRef,
                        mapOf(
                            "device_id" to currentDeviceId,
                            "last_validated_at" to FieldValue.serverTimestamp()
                        )
                    )
                    currentDeviceId
                } else if (storedDeviceId == currentDeviceId) {
                    transaction.update(docRef, "last_validated_at", FieldValue.serverTimestamp())
                    storedDeviceId
                } else {
                    throw LicenseFlowException(
                        "device-mismatch",
                        "License already used on another device."
                    )
                }
            }
        )
    }

    private fun requireFirebaseClients(): Pair<FirebaseAuth, FirebaseFirestore> {
        val authClient = auth
        val firestoreClient = firestore
        if (authClient == null || firestoreClient == null) {
            throw LicenseFlowException(
                "firebase-not-configured",
                "Firebase is not configured for this build. Add google-services.json and enable Authentication/Firestore."
            )
        }
        return authClient to firestoreClient
    }

    private fun createFirebaseAuth(): FirebaseAuth? {
        if (!isFirebaseConfigured()) {
            return null
        }
        return try {
            FirebaseAuth.getInstance()
        } catch (_error: Throwable) {
            null
        }
    }

    private fun createFirestore(): FirebaseFirestore? {
        if (!isFirebaseConfigured()) {
            return null
        }
        return try {
            FirebaseFirestore.getInstance()
        } catch (_error: Throwable) {
            null
        }
    }

    private fun isFirebaseConfigured(): Boolean {
        return try {
            if (FirebaseApp.getApps(context).isNotEmpty()) {
                true
            } else {
                FirebaseApp.initializeApp(context) != null
            }
        } catch (_error: Throwable) {
            false
        }
    }

    private fun buildOfflineFallback(
        licenseKey: String,
        currentDeviceId: String,
        networkErrorMessage: String
    ): LicenseCheckResult? {
        val cachedLicenseKey = getCachedLicenseKey()
        val cachedExpiryMs = getCachedExpiryDateMs() ?: return null
        val cachedServerCheckMs = preferences.getLong(PREF_LAST_SERVER_CHECK_MS, 0L).takeIf { it > 0L } ?: return null
        val cachedElapsedRealtimeMs = preferences.getLong(PREF_LAST_ELAPSED_REALTIME_MS, 0L).takeIf { it > 0L } ?: return null
        val cachedDeviceId = preferences.getString(PREF_DEVICE_ID, "")?.trim().orEmpty()
        val cachedBootCount = preferences.getInt(PREF_BOOT_COUNT, Int.MIN_VALUE)
        val currentBootCount = getBootCount()

        if (cachedLicenseKey.isEmpty() || cachedLicenseKey != licenseKey) {
            return null
        }
        if (cachedDeviceId.isEmpty() || cachedDeviceId != currentDeviceId) {
            return null
        }
        if (cachedBootCount != Int.MIN_VALUE && currentBootCount != Int.MIN_VALUE && cachedBootCount != currentBootCount) {
            return null
        }

        val elapsedDeltaMs = (SystemClock.elapsedRealtime() - cachedElapsedRealtimeMs).coerceAtLeast(0L)
        val estimatedServerNowMs = cachedServerCheckMs + elapsedDeltaMs
        if (estimatedServerNowMs >= cachedExpiryMs) {
            clearCachedLicense()
            return LicenseCheckResult(
                ok = false,
                isLicensed = false,
                reasonCode = "expired-offline",
                message = "License expired while offline.",
                licenseKeyMasked = maskLicense(licenseKey),
                expiryDateMs = cachedExpiryMs,
                remainingDays = 0,
                source = "offline-cache",
                deviceId = currentDeviceId,
                checkedAtServerMs = cachedServerCheckMs,
                usedOfflineFallback = true
            )
        }

        return LicenseCheckResult(
            ok = true,
            isLicensed = true,
            reasonCode = "valid-offline-cache",
            message = "License verified from offline cache (${networkErrorMessage.ifBlank { "network unavailable" }}).",
            licenseKeyMasked = maskLicense(licenseKey),
            expiryDateMs = cachedExpiryMs,
            remainingDays = calculateRemainingDays(cachedExpiryMs, estimatedServerNowMs),
            source = "offline-cache",
            deviceId = currentDeviceId,
            checkedAtServerMs = cachedServerCheckMs,
            usedOfflineFallback = true
        )
    }

    private fun invalidLicenseResult(
        reasonCode: String,
        message: String,
        deviceId: String,
        licenseKey: String
    ): LicenseCheckResult {
        clearCachedLicense()
        return LicenseCheckResult(
            ok = false,
            isLicensed = false,
            reasonCode = reasonCode,
            message = message,
            licenseKeyMasked = if (licenseKey.isEmpty()) null else maskLicense(licenseKey),
            expiryDateMs = null,
            remainingDays = null,
            source = "server",
            deviceId = deviceId,
            checkedAtServerMs = null,
            usedOfflineFallback = false
        )
    }

    private fun normalizeLicenseKey(rawValue: String): String {
        return rawValue.trim()
    }

    private fun normalizeStatus(rawStatus: String?): String {
        return rawStatus?.trim()?.lowercase(Locale.US).orEmpty()
    }

    private fun extractExpiryMs(documentSnapshot: DocumentSnapshot): Long? {
        return documentSnapshot.getTimestamp("expiry_date")?.toDate()?.time
    }

    private fun calculateRemainingDays(expiryMs: Long, serverNowMs: Long): Long {
        val remainingMs = (expiryMs - serverNowMs).coerceAtLeast(0L)
        return ceil(remainingMs.toDouble() / MILLIS_PER_DAY.toDouble()).toLong()
    }

    private fun getDeviceId(): String {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        return androidId?.trim().takeUnless { it.isNullOrEmpty() } ?: "unknown-device"
    }

    private fun getBootCount(): Int {
        return try {
            Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT)
        } catch (_error: Throwable) {
            Int.MIN_VALUE
        }
    }

    private fun saveCache(
        licenseKey: String,
        expiryDateMs: Long,
        lastServerCheckMs: Long,
        elapsedRealtimeMs: Long,
        deviceId: String
    ) {
        preferences.edit()
            .putString(PREF_LICENSE_KEY, licenseKey)
            .putLong(PREF_EXPIRY_DATE_MS, expiryDateMs)
            .putLong(PREF_LAST_SERVER_CHECK_MS, lastServerCheckMs)
            .putLong(PREF_LAST_ELAPSED_REALTIME_MS, elapsedRealtimeMs)
            .putString(PREF_DEVICE_ID, deviceId)
            .putInt(PREF_BOOT_COUNT, getBootCount())
            .apply()
    }

    private fun getCachedLicenseKey(): String {
        return preferences.getString(PREF_LICENSE_KEY, "")?.trim().orEmpty()
    }

    private fun getCachedExpiryDateMs(): Long? {
        return preferences.getLong(PREF_EXPIRY_DATE_MS, 0L).takeIf { it > 0L }
    }

    private fun maskLicense(licenseKey: String): String {
        val compact = licenseKey.replace("\\s+".toRegex(), "")
        if (compact.length <= 4) {
            return "****"
        }
        if (compact.length <= 8) {
            return "${compact.take(2)}****${compact.takeLast(2)}"
        }
        return "${compact.take(4)}****${compact.takeLast(4)}"
    }

    private fun isLikelyNetworkError(error: Throwable): Boolean {
        val firestoreError = error as? FirebaseFirestoreException ?: return false
        return firestoreError.code == FirebaseFirestoreException.Code.UNAVAILABLE ||
            firestoreError.code == FirebaseFirestoreException.Code.DEADLINE_EXCEEDED ||
            firestoreError.code == FirebaseFirestoreException.Code.ABORTED
    }

    private fun mapFirebaseErrorToResult(
        error: Throwable,
        fallbackReason: String,
        fallbackMessage: String,
        deviceId: String,
        licenseKey: String
    ): LicenseCheckResult {
        val rawMessage = error.message.orEmpty()
        val upperMessage = rawMessage.uppercase(Locale.US)

        if (error is TimeoutException || upperMessage.contains("TIMEOUT")) {
            return invalidLicenseResult(
                "timeout",
                "Firebase request timed out. Check internet and try again.",
                deviceId,
                licenseKey
            )
        }

        if (upperMessage.contains("CONFIGURATION_NOT_FOUND")) {
            return invalidLicenseResult(
                "auth-config-missing",
                "Firebase Authentication is not configured. Enable Authentication > Anonymous.",
                deviceId,
                licenseKey
            )
        }

        if (upperMessage.contains("PERMISSION_DENIED")) {
            return invalidLicenseResult(
                "permission-denied",
                "Firestore access denied. Check licenses and _server_clock security rules.",
                deviceId,
                licenseKey
            )
        }

        return invalidLicenseResult(
            fallbackReason,
            rawMessage.ifBlank { fallbackMessage },
            deviceId,
            licenseKey
        )
    }

    private fun <T> awaitTask(task: Task<T>, timeoutSeconds: Long = 12L): T {
        return Tasks.await(task, timeoutSeconds, TimeUnit.SECONDS)
    }

    companion object {
        private const val LICENSES_COLLECTION = "licenses"
        private const val SERVER_CLOCK_COLLECTION = "_server_clock"
        private const val PREFS_NAME = "mf_license_cache_v1"
        private const val PREF_LICENSE_KEY = "license_key"
        private const val PREF_EXPIRY_DATE_MS = "expiry_date_ms"
        private const val PREF_LAST_SERVER_CHECK_MS = "last_server_check_ms"
        private const val PREF_LAST_ELAPSED_REALTIME_MS = "last_elapsed_realtime_ms"
        private const val PREF_DEVICE_ID = "device_id"
        private const val PREF_BOOT_COUNT = "boot_count"
        private const val MILLIS_PER_DAY = 24L * 60L * 60L * 1000L
    }
}

package com.mohonfinderph.app.licensing

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.util.concurrent.Executors

class LicenseModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val manager = LicenseManager(reactContext.applicationContext)
    private val executor = Executors.newSingleThreadExecutor()

    override fun getName(): String = "LicenseModule"

    @ReactMethod
    fun initializeRuntime(promise: Promise) {
        runAsync(promise) {
            manager.initializeAndRevalidate()
        }
    }

    @ReactMethod
    fun activateLicense(licenseKey: String, promise: Promise) {
        runAsync(promise) {
            manager.activateLicense(licenseKey)
        }
    }

    @ReactMethod
    fun revalidateLicense(promise: Promise) {
        runAsync(promise) {
            manager.revalidateSavedLicense(allowOfflineFallback = true)
        }
    }

    @ReactMethod
    fun getCachedLicenseState(promise: Promise) {
        runAsync(promise) {
            manager.getCachedLicenseState()
        }
    }

    @ReactMethod
    fun clearCachedLicense(promise: Promise) {
        runAsync(promise) {
            manager.clearCachedLicense()
            manager.getCachedLicenseState()
        }
    }

    @ReactMethod
    fun getDeviceId(promise: Promise) {
        runAsync(promise) {
            val cached = manager.getCachedLicenseState()
            cached.copy(
                ok = true,
                reasonCode = "device-id",
                message = "Device ID loaded.",
                isLicensed = cached.isLicensed
            )
        }
    }

    override fun invalidate() {
        super.invalidate()
        executor.shutdownNow()
    }

    private fun runAsync(promise: Promise, action: () -> LicenseCheckResult) {
        executor.execute {
            try {
                val result = action.invoke()
                promise.resolve(result.toWritableMap())
            } catch (error: Throwable) {
                promise.reject("LICENSE_ERROR", error.message, error)
            }
        }
    }

    private fun LicenseCheckResult.toWritableMap(): WritableMap {
        val map = Arguments.createMap()
        map.putBoolean("ok", ok)
        map.putBoolean("isLicensed", isLicensed)
        map.putString("reasonCode", reasonCode)
        map.putString("message", message)
        map.putString("licenseKeyMasked", licenseKeyMasked)
        if (expiryDateMs != null) {
            map.putDouble("expiryDateMs", expiryDateMs.toDouble())
        } else {
            map.putNull("expiryDateMs")
        }
        if (remainingDays != null) {
            map.putDouble("remainingDays", remainingDays.toDouble())
        } else {
            map.putNull("remainingDays")
        }
        map.putString("source", source)
        map.putString("deviceId", deviceId)
        if (checkedAtServerMs != null) {
            map.putDouble("checkedAtServerMs", checkedAtServerMs.toDouble())
        } else {
            map.putNull("checkedAtServerMs")
        }
        map.putBoolean("usedOfflineFallback", usedOfflineFallback)
        return map
    }
}

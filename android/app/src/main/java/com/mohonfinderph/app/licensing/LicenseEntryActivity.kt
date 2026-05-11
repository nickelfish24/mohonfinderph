package com.mohonfinderph.app.licensing

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class LicenseEntryActivity : AppCompatActivity() {
    private val manager by lazy { LicenseManager(applicationContext) }
    private val executor = Executors.newSingleThreadExecutor()

    private lateinit var licenseInput: EditText
    private lateinit var resultText: TextView
    private lateinit var progressText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        title = "License Activation"
        setContentView(buildLayout())
        initializeState()
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdownNow()
    }

    private fun initializeState() {
        runLicenseTask {
            manager.getCachedLicenseState()
        }
    }

    private fun buildLayout(): View {
        val root = ScrollView(this)
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 40, 40, 40)
        }

        val titleText = TextView(this).apply {
            text = "Enter License Key"
            textSize = 20f
        }

        licenseInput = EditText(this).apply {
            hint = "e.g. MF-PREMIUM-XXXX-XXXX"
        }

        val activateButton = Button(this).apply {
            text = "Activate License"
            setOnClickListener {
                runLicenseTask {
                    manager.activateLicense(licenseInput.text?.toString().orEmpty())
                }
            }
        }

        val revalidateButton = Button(this).apply {
            text = "Revalidate"
            setOnClickListener {
                runLicenseTask {
                    manager.revalidateSavedLicense(allowOfflineFallback = true)
                }
            }
        }

        val clearButton = Button(this).apply {
            text = "Clear Cached License"
            setOnClickListener {
                runLicenseTask {
                    manager.clearCachedLicense()
                    manager.getCachedLicenseState()
                }
            }
        }

        progressText = TextView(this).apply {
            text = "Ready"
        }

        resultText = TextView(this).apply {
            textSize = 14f
        }

        content.addView(titleText)
        content.addView(licenseInput)
        content.addView(activateButton)
        content.addView(revalidateButton)
        content.addView(clearButton)
        content.addView(progressText)
        content.addView(resultText)
        root.addView(content)
        return root
    }

    private fun runLicenseTask(task: () -> LicenseCheckResult) {
        progressText.text = "Processing..."
        executor.execute {
            val result = try {
                task.invoke()
            } catch (error: Throwable) {
                LicenseCheckResult(
                    ok = false,
                    isLicensed = false,
                    reasonCode = "activity-error",
                    message = error.message ?: "Unexpected error.",
                    licenseKeyMasked = null,
                    expiryDateMs = null,
                    remainingDays = null,
                    source = "activity",
                    deviceId = "unknown",
                    checkedAtServerMs = null,
                    usedOfflineFallback = false
                )
            }

            runOnUiThread {
                progressText.text = "Done"
                resultText.text = buildResultText(result)
            }
        }
    }

    private fun buildResultText(result: LicenseCheckResult): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
        val expiryText = result.expiryDateMs?.let { sdf.format(Date(it)) } ?: "N/A"
        val checkText = result.checkedAtServerMs?.let { sdf.format(Date(it)) } ?: "N/A"
        return buildString {
            appendLine("ok: ${result.ok}")
            appendLine("isLicensed: ${result.isLicensed}")
            appendLine("reasonCode: ${result.reasonCode}")
            appendLine("message: ${result.message}")
            appendLine("license: ${result.licenseKeyMasked ?: "N/A"}")
            appendLine("expiry: $expiryText")
            appendLine("remainingDays: ${result.remainingDays ?: "N/A"}")
            appendLine("source: ${result.source}")
            appendLine("deviceId: ${result.deviceId}")
            appendLine("checkedAt: $checkText")
            append("offlineFallback: ${result.usedOfflineFallback}")
        }
    }
}

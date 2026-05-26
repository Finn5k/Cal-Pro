import { useEffect, useRef, useState } from 'react'
import { X, Loader } from 'lucide-react'
import type { BarcodeCanvasProps } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BarcodeScanner({ onBarcodeScanned, onClose }: BarcodeCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let stream: MediaStream | null = null
    let animationFrameId: number

    const initCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not available in this browser.')
        setIsInitializing(false)
        return
      }

      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        setError('Camera requires HTTPS or localhost.')
        setIsInitializing(false)
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
            setIsInitializing(false)
          } catch (playError) {
            setError(
              playError instanceof Error
                ? playError.message
                : 'Failed to start camera preview.'
            )
            setIsInitializing(false)
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to access camera. Please check permissions.'
        )
        setIsInitializing(false)
      }
    }

    const scanBarcode = () => {
      if (!videoRef.current || !canvasRef.current || isProcessing) {
        animationFrameId = requestAnimationFrame(scanBarcode)
        return
      }

      const context = canvasRef.current.getContext('2d')
      if (!context) {
        animationFrameId = requestAnimationFrame(scanBarcode)
        return
      }

      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

      // Try to decode barcode from image data
      // For now, we'll use a simple approach - in production, use a proper barcode library
      // The quagga library would be used here, but for camera input, we need to process the canvas
      // This is a placeholder - the actual barcode decoding would happen here

      animationFrameId = requestAnimationFrame(scanBarcode)
    }

    initCamera()
    animationFrameId = requestAnimationFrame(scanBarcode)

    return () => {
      cancelAnimationFrame(animationFrameId)
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isProcessing])

  const handleCapture = async () => {
    if (!canvasRef.current || !videoRef.current) return

    setIsProcessing(true)
    const context = canvasRef.current.getContext('2d')
    if (context) {
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

      // Convert canvas to ImageData for barcode detection
      // In production, pass this to quagga.js or another barcode library
      // For now, we'll simulate a barcode detection
      try {
        // TODO: Integrate quagga.js for actual barcode detection
        // This would involve:
        // 1. Getting image data from canvas
        // 2. Running it through Quagga.decodeSingle()
        // 3. Extracting the barcode from results

        // Placeholder: Simulate barcode detection
        setTimeout(() => {
          // Example: onBarcodeScanned('5099750044096')
          setIsProcessing(false)
        }, 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to scan barcode')
        setIsProcessing(false)
      }
    }
  }

  return (
    <div className="barcode-scanner-modal">
      <div className="barcode-scanner-container">
        <div className="barcode-scanner-header">
          <h2>Scan Product Barcode</h2>
          <button className="close-button" onClick={onClose} aria-label="Close scanner">
            <X size={24} />
          </button>
        </div>

        {isInitializing ? (
          <div className="scanner-loading">
            <Loader size={40} className="spinner" />
            <p>Initializing camera...</p>
          </div>
        ) : error ? (
          <div className="scanner-error">
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="scanner-viewport">
              <video
                ref={videoRef}
                className="scanner-video"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="scanner-canvas"
                width={1280}
                height={720}
                style={{ display: 'none' }}
              />
              <div className="scanner-overlay">
                <div className="scanner-frame"></div>
              </div>
            </div>

            <div className="scanner-controls">
              <button
                className="btn btn-primary"
                onClick={handleCapture}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader size={18} className="spinner" />
                    Scanning...
                  </>
                ) : (
                  'Capture'
                )}
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

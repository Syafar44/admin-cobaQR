'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from './lib/supabase';
import QrScanner from 'qr-scanner';

export default function Home() {
  const [orderId, setOrderId] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [scannedOrderId, setScannedOrderId] = useState('');
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  const handleValidate = async (id) => {
    const { data: order, error } = await supabase
      .from('QRcode')
      .select('*')
      .eq('id', id || orderId)
      .single();

    if (error) {
      console.error('Order not found:', error);
      alert('Order not found');
      return;
    }

    if (order.is_scanned) {
      alert('Order already validated');
      return;
    }

    const { error: updateError } = await supabase
      .from('QRcode')
      .update({ is_scanned: true, status: 'Completed' })
      .eq('id', id || orderId);

    if (updateError) {
      console.error('Failed to validate order:', updateError);
      alert('Failed to validate order');
      return;
    }

    setValidationResult(order);
    alert('Order validated successfully');
  };

  const startScanning = async () => {
    if (isScanning) return;

    const videoElement = videoRef.current;
    if (!videoElement) {
      alert('Video element not found');
      return;
    }

    try {
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        alert('No camera found on this device.');
        return;
      }

      const qrScanner = new QrScanner(
        videoElement,
        (result) => {
          console.log('QR Code detected:', result.data);
          setScannedOrderId(result.data); // Simpan data QR code untuk konfirmasi
          setShowConfirmation(true); // Tampilkan popup konfirmasi
          qrScanner.stop(); // Hentikan scanner
          setIsScanning(false);
        },
        {
          onDecodeError: (error) => {
            console.warn('QR Decode Error:', error.message);
          },
          highlightScanRegion: true,
        }
      );

      scannerRef.current = qrScanner;
      console.log('Starting QR Scanner...');
      qrScanner.start();
      setIsScanning(true);
    } catch (error) {
      console.error('Error initializing camera:', error);
      alert('Failed to access the camera. Check permissions or device.');
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const handleConfirm = () => {
    setShowConfirmation(false); // Tutup popup
    handleValidate(scannedOrderId); // Validasi QR code
  };

  const handleCancel = () => {
    setShowConfirmation(false); // Tutup popup tanpa validasi
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Validate Order</h1>

      <div>
        <label htmlFor="order-id">Enter Order ID or Scan QR Code:</label>
        <input
          id="order-id"
          type="text"
          placeholder="Enter Order ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <button onClick={() => handleValidate()}>Validate</button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button onClick={startScanning}>
          {isScanning ? 'Scanning...' : 'Scan QR Code'}
        </button>
        {isScanning && <button onClick={stopScanning}>Stop Scanning</button>}
        <div style={{ marginTop: '10px', maxWidth: '400px' }}>
          <video
            ref={videoRef}
            style={{ width: '100%' }}
            playsInline
            autoPlay
            muted
          />
        </div>
      </div>

      {showConfirmation && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid black',
            zIndex: 1000,
          }}
        >
          <h3>Confirm Order Validation</h3>
          <p>Order ID: {scannedOrderId}</p>
          <button onClick={handleConfirm}>Confirm</button>
          <button onClick={handleCancel} style={{ marginLeft: '10px' }}>
            Cancel
          </button>
        </div>
      )}

      {validationResult && (
        <div style={{ marginTop: '20px' }}>
          <h3>Order Validated</h3>
          <p>Order ID: {validationResult.id}</p>
          <p>Coffee Type: {validationResult.coffee_type}</p>
          <p>Status: {validationResult.status}</p>
        </div>
      )}
    </div>
  );
}

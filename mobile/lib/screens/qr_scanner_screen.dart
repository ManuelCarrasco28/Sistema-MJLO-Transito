import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'vehicle_details_screen.dart';
import '../theme.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isNavigating = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isNavigating) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      String? qrData = barcodes.first.rawValue;
      if (qrData != null && qrData.isNotEmpty) {
        // Extraer solo el código si el QR contiene texto multilínea con "Codigo QR:"
        if (qrData.contains('Codigo QR:')) {
          final lines = qrData.split('\n');
          for (var line in lines) {
            if (line.trim().startsWith('Codigo QR:')) {
              qrData = line.replaceAll('Codigo QR:', '').trim();
              break;
            }
          }
        }

        setState(() {
          _isNavigating = true;
        });
        
        _controller.stop();
        
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => VehicleDetailsScreen(
              searchQuery: qrData!,
              searchType: 'QR',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Escanear QR'),
        backgroundColor: AppTheme.primaryBlue,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),
          // Overlay to guide the user
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.accentYellow, width: 4),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Apunte la cámara hacia el código QR',
                  style: TextStyle(color: Colors.white, fontSize: 16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

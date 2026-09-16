import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../theme.dart';
import 'issue_ticket_informal_screen.dart';

class FugaCaptureScreen extends StatefulWidget {
  final Map<String, dynamic> reporteBaseData;

  const FugaCaptureScreen({super.key, required this.reporteBaseData});

  @override
  State<FugaCaptureScreen> createState() => _FugaCaptureScreenState();
}

class _FugaCaptureScreenState extends State<FugaCaptureScreen> {
  final ImagePicker _picker = ImagePicker();
  final List<File> _images = [];
  final TextEditingController _observacionesController = TextEditingController();
  final TextEditingController _direccionController = TextEditingController();
  
  LatLng? _currentLocation;
  final MapController _mapController = MapController();
  bool _isLoadingLocation = true;

  @override
  void initState() {
    super.initState();
    _determinePosition();
  }

  Future<void> _determinePosition() async {
    setState(() => _isLoadingLocation = true);
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Los servicios de ubicación están desactivados.')));
      setState(() => _isLoadingLocation = false);
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Permiso de ubicación denegado.')));
        setState(() => _isLoadingLocation = false);
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Permiso de ubicación denegado permanentemente.')));
      setState(() => _isLoadingLocation = false);
      return;
    } 

    try {
      Position position = await Geolocator.getCurrentPosition();
      setState(() {
        _currentLocation = LatLng(position.latitude, position.longitude);
        _isLoadingLocation = false;
      });
      _mapController.move(_currentLocation!, 16.0);
    } catch (e) {
      setState(() => _isLoadingLocation = false);
    }
  }

  Future<void> _takePhoto() async {
    if (_images.length >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Máximo 3 fotos permitidas.')));
      return;
    }
    try {
      final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
      if (photo != null) {
        setState(() {
          _images.add(File(photo.path));
        });
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error al tomar foto: $e')));
    }
  }

  void _continuar() {
    if (_images.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Debe tomar al menos una captura del vehículo.')));
      return;
    }
    if (_currentLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Se requiere la ubicación exacta.')));
      return;
    }

    // Combine data
    final reporteData = Map<String, dynamic>.from(widget.reporteBaseData);
    reporteData['fuga'] = true;
    reporteData['fuga_latitud'] = _currentLocation!.latitude;
    reporteData['fuga_longitud'] = _currentLocation!.longitude;
    reporteData['fuga_direccion'] = _direccionController.text.trim();
    reporteData['fuga_observaciones'] = _observacionesController.text.trim();
    reporteData['fuga_imagenes'] = _images.map((e) => e.path).toList(); // Local paths for now

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => IssueTicketInformalScreen(reporteData: reporteData),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reporte Fuga y Sin Placa', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.red.shade800,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Capturas del Vehículo', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
            const SizedBox(height: 8),
            const Text('Tome fotos que evidencien las características del vehículo y el conductor fugado.', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 12),
            
            // Photo Grid
            if (_images.isNotEmpty)
              SizedBox(
                height: 120,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _images.length,
                  itemBuilder: (context, index) {
                    return Stack(
                      children: [
                        Container(
                          margin: const EdgeInsets.only(right: 12),
                          width: 120,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            image: DecorationImage(image: FileImage(_images[index]), fit: BoxFit.cover),
                          ),
                        ),
                        Positioned(
                          right: 16,
                          top: 4,
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _images.removeAt(index);
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                              child: const Icon(Icons.delete, color: Colors.white, size: 20),
                            ),
                          ),
                        )
                      ],
                    );
                  },
                ),
              ),
              
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _takePhoto,
              icon: const Icon(Icons.camera_alt),
              label: const Text('Tomar Captura'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryBlue,
                foregroundColor: Colors.white,
              ),
            ),
            
            const SizedBox(height: 24),
            const Text('Ubicación de Intervención', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
            const SizedBox(height: 12),
            
            Container(
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(12),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: _isLoadingLocation 
                  ? const Center(child: CircularProgressIndicator())
                  : FlutterMap(
                      mapController: _mapController,
                      options: MapOptions(
                        initialCenter: _currentLocation ?? const LatLng(-6.7712, -79.8459), // Default to Chiclayo area
                        initialZoom: 16.0,
                        onTap: (tapPosition, point) {
                          setState(() {
                            _currentLocation = point;
                          });
                        },
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.angelus.app_transito',
                        ),
                        if (_currentLocation != null)
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: _currentLocation!,
                                width: 40,
                                height: 40,
                                child: const Icon(Icons.location_pin, color: Colors.red, size: 40),
                              ),
                            ],
                          ),
                      ],
                    ),
              ),
            ),
            const SizedBox(height: 8),
            const Text('Toque el mapa para ajustar la ubicación exacta.', style: TextStyle(color: Colors.grey, fontSize: 12)),
            
            const SizedBox(height: 16),
            TextField(
              controller: _direccionController,
              decoration: InputDecoration(
                labelText: 'Dirección o Referencia',
                prefixIcon: const Icon(Icons.map),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            
            const SizedBox(height: 24),
            const Text('Observaciones', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
            const SizedBox(height: 12),
            TextField(
              controller: _observacionesController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Detalles del vehículo, dirección de fuga, etc.',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            
            const SizedBox(height: 80), // Padding for bottom button
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _continuar,
        backgroundColor: Colors.red.shade700,
        icon: const Icon(Icons.arrow_forward, color: Colors.white),
        label: const Text('Proceder a Infracción', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}

import 'dart:convert';
import 'dart:typed_data';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../utils/location_helper.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class IssueTicketScreen extends StatefulWidget {
  final Map<String, dynamic> vehicleData;

  const IssueTicketScreen({super.key, required this.vehicleData});

  @override
  State<IssueTicketScreen> createState() => _IssueTicketScreenState();
}

class _IssueTicketScreenState extends State<IssueTicketScreen> {
  final SignatureController _signatureController = SignatureController(
    penStrokeWidth: 3,
    penColor: const Color(0xFF1E3A8A),
    exportBackgroundColor: Colors.white,
  );

  bool _isLoading = true;
  bool _isLoadingLocation = false;
  bool _isSubmitting = false;
  bool? _permitePapeletaMovil;
  List<dynamic> _tiposInfraccion = [];
  
  // Lista dinámica de infracciones seleccionadas
  final List<String?> _selectedInfraccionesIds = [null];
  
  String _lugar = '';
  String _observaciones = '';
  String _observacionesConductor = '';
  
  final List<XFile> _fotos = [];
  Position? _currentPosition;
  final ImagePicker _picker = ImagePicker();
  
  late TextEditingController _lugarController;
  final TextEditingController _coordenadasController = TextEditingController();
  final MapController _mapController = MapController();

  // Datos del Conductor (si es distinto al dueño)
  bool _conductorEsDueno = true;
  final _dniConductor = TextEditingController();
  final _nombresConductor = TextEditingController();
  final _apellidosConductor = TextEditingController();

  // Datos del Dueño (si falta info)
  final _dniDueno = TextEditingController();
  final _nombresDueno = TextEditingController();
  final _apellidosDueno = TextEditingController();

  bool _isSearching = false;



  bool get _tieneDuenoIdentificado {
    final nombre = _nombresDueno.text.trim();
    return nombre.isNotEmpty && nombre != 'Sin Propietario Asignado' && nombre != 'No Registrado' && nombre != 'Sin Propietario';
  }

  Future<void> _searchPersona(TextEditingController dniCtrl, TextEditingController nomCtrl, TextEditingController apeCtrl) async {
    final dni = dniCtrl.text.trim();
    if (dni.isEmpty) {
      _showError('Ingrese un documento para buscar');
      return;
    }

    setState(() => _isSearching = true);
    try {
      final persona = await ApiService.getPersonaByDni(dni);
      if (persona != null) {
        setState(() {
          nomCtrl.text = persona['nombres'] ?? '';
          apeCtrl.text = '${persona['apellidoPaterno'] ?? ''} ${persona['apellidoMaterno'] ?? ''}'.trim();
        });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Datos encontrados')));
      } else {
        _showError('No se encontró a la persona en la base de datos');
      }
    } catch (e) {
      _showError('Error al buscar persona: $e');
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _lugarController = TextEditingController(text: _lugar);
    
    // Initialize Dueño fields if data exists
    _dniDueno.text = widget.vehicleData['propietarioDni']?.toString() ?? '';
    
    String rawPropietario = widget.vehicleData['propietarioNombre']?.toString() ?? widget.vehicleData['propietario']?.toString() ?? '';
    if (widget.vehicleData['propietarioApellidos']?.toString().isNotEmpty == true) {
      _nombresDueno.text = rawPropietario;
      _apellidosDueno.text = widget.vehicleData['propietarioApellidos'].toString();
    } else {
      if (rawPropietario.isNotEmpty && rawPropietario != 'Sin Propietario Asignado' && rawPropietario != 'No Registrado' && rawPropietario != 'Sin Propietario') {
        _nombresDueno.text = rawPropietario;
        _apellidosDueno.text = '';
      } else {
        _nombresDueno.text = rawPropietario;
        _apellidosDueno.text = '';
      }
    }

    _loadTiposInfraccion();
  }

  Future<void> _loadTiposInfraccion() async {
    try {
      final permite = await ApiService.permiteAplicarPapeletaMovil();
      final response = await ApiService.getTiposInfraccion();
      setState(() {
        _permitePapeletaMovil = permite;
        _tiposInfraccion = response;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _permitePapeletaMovil = false;
        _tiposInfraccion = [];
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo verificar el permiso móvil. Se registrará como reporte.')),
        );
      }
    }
  }

  Future<void> _takePhoto() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
        maxWidth: 1600,
        maxHeight: 1600,
      );
      if (photo != null) {
        setState(() {
          _fotos.add(photo);
        });
      }
    } catch (e) {
      _showError('Error al tomar la foto: $e');
    }
  }

  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLoadingLocation = true;
    });

    try {
      final position = await obtenerPosicionActualConContexto(context);
      final address = await obtenerDireccionDesdePosicion(position);

      setState(() {
        _currentPosition = position;
        _lugarController.text = address;
        _lugar = address;
        _coordenadasController.text = '${position.latitude}, ${position.longitude}';
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ubicación obtenida correctamente')),
        );
      }
    } catch (e) {
      _showError(e is Exception ? e.toString().replaceFirst('Exception: ', '') : 'Error al obtener la ubicación: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingLocation = false;
        });
      }
    }
  }

  Map<String, String> _resolverDatosConductor() {
    final conductorEsD = _tieneDuenoIdentificado && _conductorEsDueno;
    final String nombre = conductorEsD
        ? '${_nombresDueno.text.trim()} ${_apellidosDueno.text.trim()}'
        : '${_nombresConductor.text.trim()} ${_apellidosConductor.text.trim()}';
    final String dni = conductorEsD
        ? _dniDueno.text.trim()
        : _dniConductor.text.trim();
    final String nombres = conductorEsD
        ? _nombresDueno.text.trim()
        : _nombresConductor.text.trim();
    final String apellidos = conductorEsD
        ? _apellidosDueno.text.trim()
        : _apellidosConductor.text.trim();

    return {
      'nombre': nombre,
      'dni': dni,
      'nombres': nombres,
      'apellidos': apellidos,
    };
  }

  Future<List<String>> _fotosToBase64() async {
    final List<String> fotosBase64 = [];
    for (var foto in _fotos) {
      final bytes = await foto.readAsBytes();
      fotosBase64.add(base64Encode(bytes));
    }
    return fotosBase64;
  }

  double get _montoTotal {
    double total = 0;
    for (String? id in _selectedInfraccionesIds) {
      if (id != null) {
        final infraccion = _tiposInfraccion.firstWhere((i) => i['id'].toString() == id);
        total += (infraccion['montoBase'] as num).toDouble();
      }
    }
    return total;
  }

  Future<void> _submitTicket() async {
    // Evita el doble toque: el botón se bloquea desde el primer instante, antes de consultar el permiso
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);
    try {
      await _submitTicketInterno();
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _submitTicketInterno() async {
    bool permisoActual = _permitePapeletaMovil == true;
    try {
      permisoActual = await ApiService.permiteAplicarPapeletaMovil();
      if (mounted) {
        setState(() => _permitePapeletaMovil = permisoActual);
      }
    } catch (_) {
      permisoActual = false;
      // No se pudo confirmar el permiso: se avisa en vez de cambiar a "solo reporte" sin explicación
      _showError('No se pudo verificar si puede aplicar papeletas. Se registrará como reporte de intervención.');
    }

    if (!permisoActual) {
      await _submitOnlyReport();
      return;
    }

    final validInfracciones = _selectedInfraccionesIds.where((id) => id != null).toList();

    if (validInfracciones.isEmpty) {
      _showError('Seleccione al menos un tipo de infracción');
      return;
    }

    final conductorEsD = _tieneDuenoIdentificado && _conductorEsDueno;
    if (!conductorEsD && (_dniConductor.text.isEmpty || _nombresConductor.text.isEmpty)) {
      _showError('Complete los datos del conductor');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final inspectorId = await ApiService.getPersonalId();

      final List<int> infraccionesInts = validInfracciones.map((e) => int.parse(e!)).toList();

      final conductor = _resolverDatosConductor();
      final fotosBase64 = await _fotosToBase64();

      final requestData = {
        'vehiculoPlaca': widget.vehicleData['placa'] ?? widget.vehicleData['chasis'],
        'infractor': conductor['nombre'],
        'conductorDni': conductor['dni'],
        'conductorNombres': conductor['nombres'],
        'conductorApellidos': conductor['apellidos'],
        'lugar': _lugar,
        'infraccionesIds': infraccionesInts,
        'observacionesAutoridad': _observaciones,
        'observacionesConductor': _observacionesConductor,
        'inspectorId': inspectorId,
        'fotos': fotosBase64,
        'claseVehiculo': widget.vehicleData['tipo'] ?? '',
        'marcaVehiculo': widget.vehicleData['marca'] ?? '',
        'colorVehiculo': widget.vehicleData['color'] ?? '',
        'duenoDni': _dniDueno.text.trim(),
        'duenoNombres': _nombresDueno.text.trim(),
        'duenoApellidos': _apellidosDueno.text.trim(),
      };

      final result = await ApiService.createPapeleta(requestData);
      final papeletaId = result['data']['id'];

      // Guardar Firma (si existe)
      if (_signatureController.isNotEmpty) {
        final Uint8List? signatureBytes = await _signatureController.toPngBytes();
        if (signatureBytes != null) {
          final base64String = base64Encode(signatureBytes);
          await ApiService.uploadFirma(papeletaId, base64String);
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('¡Papeleta generada con éxito!'), backgroundColor: Colors.green),
        );
        Navigator.of(context).popUntil((route) => route.isFirst); // Volver al detalle
      }
    } catch (e) {
      _showError('Error al generar papeleta: $e');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _submitOnlyReport() async {
    if (_lugar.trim().isEmpty) {
      _showError('Falta ingresar el lugar de intervención (ubicación)');
      return;
    }
    if (_observaciones.trim().isEmpty) {
      _showError('Falta ingresar las observaciones obligatorias para el reporte');
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final inspectorId = await ApiService.getPersonalId();
      final String placa = (widget.vehicleData['placa'] != null && widget.vehicleData['placa'].toString().trim().isNotEmpty)
          ? widget.vehicleData['placa'].toString().trim().toUpperCase()
          : '';

      final fotosBase64 = await _fotosToBase64();
      final conductor = _resolverDatosConductor();

      await ApiService.createReporteIntervencion({
        'inspectorId': inspectorId,
        'placa': placa,
        'lugar': _lugar,
        'observaciones': _observaciones,
        'observacionesConductor': _observacionesConductor,
        'coordenadas': _currentPosition != null ? '${_currentPosition!.latitude},${_currentPosition!.longitude}' : '',
        'fotos': fotosBase64,
        'infraccionesIds': _selectedInfraccionesIds.where((id) => id != null).toList(),
        'dni_conductor': conductor['dni'],
        'nombres_conductor': conductor['nombres'],
        'apellidos_conductor': conductor['apellidos'],
        'dni_dueño': widget.vehicleData['propietarioDni'] ?? '',
        'nombres_dueño': (widget.vehicleData['propietarioNombres']?.toString().isNotEmpty == true)
            ? widget.vehicleData['propietarioNombres']
            : (widget.vehicleData['propietario'] ?? ''),
        'apellidos_dueño': '${widget.vehicleData['propietarioPaterno'] ?? ''} ${widget.vehicleData['propietarioMaterno'] ?? ''}'.trim(),
        'claseVehiculo': widget.vehicleData['tipo'] ?? '',
        'marcaVehiculo': widget.vehicleData['marca'] ?? '',
        'colorVehiculo': widget.vehicleData['color'] ?? '',
        'motorVehiculo': '', // Not easily available in simple formal view sometimes
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reporte enviado a administración para revisión.'), backgroundColor: Colors.green),
        );
        Navigator.of(context).popUntil((route) => route.isFirst); // Volver al detalle
      }
    } catch (e) {
      _showError('Error al guardar reporte: $e');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showError(String msg) {
    final cleanMsg = msg.replaceAll('Exception: ', '');
    if (mounted) {
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(cleanMsg), backgroundColor: Colors.red));
    }
  }

  @override
  void dispose() {
    _signatureController.dispose();
    _dniConductor.dispose();
    _nombresConductor.dispose();
    _apellidosConductor.dispose();
    _lugarController.dispose();
    _coordenadasController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String identificador = widget.vehicleData['placa'] ?? widget.vehicleData['chasis'] ?? 'Sin Identificar';
    final bool permisoVerificado = _permitePapeletaMovil != null;
    final bool permitePapeleta = _permitePapeletaMovil == true;
    final Color accentColor = permitePapeleta ? Colors.red.shade700 : AppTheme.primaryBlue;
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(!permisoVerificado ? 'Cargando...' : permitePapeleta ? 'Generar Papeleta' : 'Registrar Evidencia', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppTheme.primaryBlue,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: Colors.red.shade700))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Vehículo infractor:',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          identificador,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.black87),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  _buildSectionTitle('Identificación del Conductor'),
                  if (_tieneDuenoIdentificado)
                    Container(
                      padding: const EdgeInsets.all(8),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(12)),
                      child: SwitchListTile(
                        title: const Text('El dueño está conduciendo', style: TextStyle(fontWeight: FontWeight.bold)),
                        value: _conductorEsDueno,
                        activeColor: Colors.orange.shade700,
                        onChanged: (val) => setState(() => _conductorEsDueno = val),
                      ),
                    ),

                  if (!_tieneDuenoIdentificado || !_conductorEsDueno)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(12)),
                      child: Column(
                        children: [
                          _buildTextField(_dniConductor, 'N° Doc. del Conductor', Icons.badge, TextInputType.number, hasSearch: true, maxLength: 15, onSearch: () => _searchPersona(_dniConductor, _nombresConductor, _apellidosConductor)),
                          const SizedBox(height: 12),
                          _buildTextField(_nombresConductor, 'Nombres', Icons.person, TextInputType.name),
                          const SizedBox(height: 12),
                          _buildTextField(_apellidosConductor, 'Apellidos', Icons.person_outline, TextInputType.name),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),
                  if (!permitePapeleta)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade300),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.amber.shade800),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Las infracciones se guardarán como evidencia y serán verificadas por la administración.',
                              style: TextStyle(color: Colors.amber.shade900, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),

                  _buildSectionTitle('Infracciones a Aplicar'),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                      ],
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _selectedInfraccionesIds.length,
                          itemBuilder: (context, index) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12.0),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: DropdownButtonFormField<String>(
                                      decoration: InputDecoration(
                                        labelText: 'Infracción ${index + 1}',
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                        filled: true,
                                        fillColor: Colors.grey.shade50,
                                      ),
                                      value: _selectedInfraccionesIds[index],
                                      isExpanded: true,
                                      menuMaxHeight: 400,
                                      items: _tiposInfraccion.where((tipo) {
                                        String idStr = tipo['id'].toString();
                                        return !_selectedInfraccionesIds.contains(idStr) || _selectedInfraccionesIds[index] == idStr;
                                      }).map((tipo) {
                                        return DropdownMenuItem<String>(
                                          value: tipo['id'].toString(),
                                          child: Text('${tipo['codigo']} - ${tipo['descripcion']} (S/ ${tipo['montoBase']})', overflow: TextOverflow.ellipsis),
                                        );
                                      }).toList(),
                                      onChanged: (val) {
                                        setState(() {
                                          _selectedInfraccionesIds[index] = val;
                                        });
                                      },
                                    ),
                                  ),
                                  if (_selectedInfraccionesIds.length > 1)
                                    IconButton(
                                      icon: const Icon(Icons.remove_circle, color: Colors.red),
                                      onPressed: () {
                                        setState(() {
                                          _selectedInfraccionesIds.removeAt(index);
                                        });
                                      },
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                        TextButton.icon(
                          onPressed: () {
                            setState(() {
                              _selectedInfraccionesIds.add(null);
                            });
                          },
                          icon: const Icon(Icons.add, color: Color(0xFF1E3A8A)),
                          label: const Text('Añadir otra infracción', style: TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.bold)),
                        )
                      ],
                    ),
                  ),
                  
                  if (permitePapeleta) ...[
                    const SizedBox(height: 16),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        'TOTAL DE PAPELETA: S/ $_montoTotal',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                      ],
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _lugarController,
                          decoration: InputDecoration(
                            labelText: 'Lugar de Intervención (Calle/Nombre)',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            prefixIcon: const Icon(Icons.location_on, color: Colors.grey),
                            suffixIcon: Padding(
                              padding: const EdgeInsets.all(4.0),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryBlue,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: _isLoadingLocation 
                                    ? const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)))
                                    : IconButton(
                                        icon: const Icon(Icons.my_location, color: Colors.white),
                                        onPressed: _getCurrentLocation,
                                      ),
                              ),
                            ),
                          ),
                          onChanged: (val) => _lugar = val,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _coordenadasController,
                          readOnly: true,
                          decoration: InputDecoration(
                            labelText: 'Coordenadas exactas',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            filled: true,
                            fillColor: Colors.grey.shade100,
                            prefixIcon: const Icon(Icons.gps_fixed, color: Colors.grey),
                          ),
                        ),
                        if (_currentPosition != null) ...[
                          const SizedBox(height: 12),
                          const Text('Ajuste manual (toca el mapa para cambiar la ubicación exacta)', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          const SizedBox(height: 4),
                          Container(
                            height: 200,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey.shade300),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: FlutterMap(
                              mapController: _mapController,
                              options: MapOptions(
                                initialCenter: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                                initialZoom: 16.0,
                                onTap: (tapPosition, point) {
                                  setState(() {
                                    _currentPosition = Position(
                                      latitude: point.latitude,
                                      longitude: point.longitude,
                                      timestamp: DateTime.now(),
                                      accuracy: 0.0,
                                      altitude: 0.0,
                                      heading: 0.0,
                                      speed: 0.0,
                                      speedAccuracy: 0.0,
                                      altitudeAccuracy: 0.0,
                                      headingAccuracy: 0.0,
                                    );
                                    _coordenadasController.text = '${point.latitude}, ${point.longitude}';
                                    _lugar = _lugarController.text; // Ensure lugar is updated
                                  });
                                },
                              ),
                              children: [
                                TileLayer(
                                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                  userAgentPackageName: 'com.mjlo.transito',
                                ),
                                MarkerLayer(
                                  markers: [
                                    Marker(
                                      point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                                      width: 40,
                                      height: 40,
                                      child: const Icon(Icons.location_on, color: Colors.red, size: 40),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        TextFormField(
                          decoration: InputDecoration(
                            labelText: 'Observaciones del Inspector',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            alignLabelWithHint: true,
                          ),
                          maxLines: 3,
                          onChanged: (val) => _observaciones = val,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          decoration: InputDecoration(
                            labelText: 'Observaciones del Conductor (Opcional)',
                            hintText: 'Manifestación, descargo o comentarios del conductor...',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            alignLabelWithHint: true,
                          ),
                          maxLines: 3,
                          onChanged: (val) => _observacionesConductor = val,
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: const Text('Evidencia Fotográfica', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton.icon(
                                    onPressed: _takePhoto,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.orange.shade600,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    ),
                                    icon: const Icon(Icons.camera_alt, size: 20),
                                    label: const Text('Tomar Foto', style: TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                        if (_fotos.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          SizedBox(
                            height: 100,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: _fotos.length,
                              itemBuilder: (context, index) {
                                return Stack(
                                  children: [
                                    Container(
                                      margin: const EdgeInsets.only(right: 8, top: 8),
                                      width: 100,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(8),
                                        image: DecorationImage(
                                          image: FileImage(File(_fotos[index].path)),
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      right: 0,
                                      top: 0,
                                      child: GestureDetector(
                                        onTap: () {
                                          setState(() {
                                            _fotos.removeAt(index);
                                          });
                                        },
                                        child: Container(
                                          decoration: const BoxDecoration(
                                            color: Colors.red,
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.close, color: Colors.white, size: 20),
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                          ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 32),
                  if (permitePapeleta) ...[
                  _buildSectionTitle('Firma del Conductor Actual'),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF1E3A8A).withOpacity(0.3), width: 2),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                      ],
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E3A8A).withOpacity(0.05),
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                          ),
                          child: const Text('Dibuje su firma en el recuadro', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.bold)),
                        ),
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(14)),
                          child: Signature(
                            controller: _signatureController,
                            height: 200,
                            backgroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () => _signatureController.clear(),
                      icon: const Icon(Icons.cleaning_services_rounded, color: Colors.grey),
                      label: const Text('Limpiar Firma', style: TextStyle(color: Colors.grey)),
                    ),
                  ),
                  ],

                ],
              ),
            ),
      bottomNavigationBar: _isLoading 
          ? null 
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _submitTicket,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accentColor,
                      foregroundColor: Colors.white,
                      elevation: 5,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    icon: _isSubmitting ? const SizedBox() : Icon(permitePapeleta ? Icons.gavel : Icons.send),
                    label: _isSubmitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : Text(permitePapeleta ? 'Generar Papeleta' : 'Enviar Evidencia a Administración', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, TextInputType type, {bool hasSearch = false, VoidCallback? onSearch, int? maxLength}) {
    return TextField(
      controller: controller,
      keyboardType: type,
      textCapitalization: TextCapitalization.characters,
      maxLength: maxLength,
      decoration: InputDecoration(
        labelText: label,
        counterText: '',
        prefixIcon: Icon(icon, color: Colors.grey.shade600),
        suffixIcon: hasSearch
            ? Padding(
                padding: const EdgeInsets.all(4.0),
                child: ElevatedButton(
                  onPressed: _isSearching ? null : onSearch,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  child: _isSearching 
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) 
                      : const Text('Buscar', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              )
            : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0, left: 4),
      child: Text(
        title,
        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey.shade800),
      ),
    );
  }
}

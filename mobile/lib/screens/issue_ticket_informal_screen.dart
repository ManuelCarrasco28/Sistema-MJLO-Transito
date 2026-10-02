import 'dart:convert';
import 'dart:typed_data';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme.dart';

class IssueTicketInformalScreen extends StatefulWidget {
  final Map<String, dynamic> reporteData;

  const IssueTicketInformalScreen({super.key, required this.reporteData});

  @override
  State<IssueTicketInformalScreen> createState() => _IssueTicketInformalScreenState();
}

class _IssueTicketInformalScreenState extends State<IssueTicketInformalScreen> {
  final SignatureController _signatureController = SignatureController(
    penStrokeWidth: 3,
    penColor: const Color(0xFF1E3A8A),
    exportBackgroundColor: Colors.white,
  );

  bool _isLoading = true;
  bool _isSubmitting = false;
  bool? _permitePapeletaMovil;
  List<dynamic> _tiposInfraccion = [];
  
  // Lista dinámica de infracciones seleccionadas
  final List<String?> _selectedInfraccionesIds = [null];

  @override
  void initState() {
    super.initState();
    _loadTiposInfraccion();
  }

  Future<void> _loadTiposInfraccion() async {
    try {
      bool permite = await ApiService.permiteAplicarPapeletaMovil();
      final placa = widget.reporteData['placa']?.toString().toUpperCase().trim() ?? '';
      if (widget.reporteData['estado_placa'] == 'SIN_PLACA' || placa.startsWith('SIN PLACA') || placa.startsWith('SIN-PLACA')) {
        permite = false;
      }
      
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
          const SnackBar(content: Text('No se pudo verificar el permiso móvil. Se registrará como evidencia.')),
        );
      }
    }
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

  Future<void> _submitReportAndTicket() async {
    bool permisoActual = _permitePapeletaMovil == true;
    try {
      bool backendPermite = await ApiService.permiteAplicarPapeletaMovil();
      final placa = widget.reporteData['placa']?.toString().toUpperCase().trim() ?? '';
      if (widget.reporteData['estado_placa'] == 'SIN_PLACA' || placa.startsWith('SIN PLACA') || placa.startsWith('SIN-PLACA')) {
        permisoActual = false;
      } else {
        permisoActual = backendPermite;
      }
      if (mounted) {
        setState(() => _permitePapeletaMovil = permisoActual);
      }
    } catch (_) {
      permisoActual = false;
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

    setState(() => _isSubmitting = true);

    try {
      final inspectorId = await ApiService.getPersonalId();

      final List<int> infraccionesInts = validInfracciones.map((e) => int.parse(e!)).toList();

      String conductorNombre = '${widget.reporteData['nombres_conductor']} ${widget.reporteData['apellidos_conductor']}';
      
      final String placa = (widget.reporteData['placa'] != null && widget.reporteData['placa'].toString().trim().isNotEmpty)
          ? widget.reporteData['placa']
          : 'SIN_PLACA';

      List<String> fotosBase64 = [];
      if (widget.reporteData['fotos'] != null) {
        final List<dynamic> receivedFotos = widget.reporteData['fotos'];
        for (var foto in receivedFotos) {
          final bytes = await foto.readAsBytes();
          fotosBase64.add(base64Encode(bytes));
        }
      }

      final requestData = {
        'vehiculoPlaca': placa,
        'claseVehiculo': widget.reporteData['clase_vehiculo'] ?? '',
        'marcaVehiculo': widget.reporteData['marca_vehiculo'] ?? '',
        'colorVehiculo': widget.reporteData['color_vehiculo'] ?? '',
        'motorVehiculo': widget.reporteData['chasis'] ?? '',
        'infractor': widget.reporteData['fuga'] == true ? 'CONDUCTOR FUGADO / DUEÑO' : (conductorNombre.trim().isEmpty ? 'CONDUCTOR NO IDENTIFICADO' : conductorNombre),
        'conductorDni': widget.reporteData['dni_conductor'] ?? '',
        'conductorNombres': widget.reporteData['nombres_conductor'] ?? '',
        'conductorApellidos': widget.reporteData['apellidos_conductor'] ?? '',
        'duenoDni': widget.reporteData['dni_dueño'] ?? '',
        'duenoNombres': widget.reporteData['nombres_dueño'] ?? '',
        'duenoApellidos': widget.reporteData['apellidos_dueño'] ?? '',
        'lugar': widget.reporteData['lugar'] ?? '',
        'infraccionesIds': infraccionesInts,
        'observacionesAutoridad': widget.reporteData['observaciones'] ?? '',
        'inspectorId': inspectorId,
        'fuga': widget.reporteData['fuga'] ?? false,
        'fugaLatitud': widget.reporteData['fuga_latitud'],
        'fugaLongitud': widget.reporteData['fuga_longitud'],
        'fotos': fotosBase64,
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
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } catch (e) {
      _showError('Error al guardar reporte: $e');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _submitOnlyReport() async {
    final String lugar = widget.reporteData['lugar'] ?? '';
    final String obs = widget.reporteData['observaciones'] ?? '';

    if (lugar.trim().isEmpty || obs.trim().isEmpty) {
      _showError('No se recibió lugar u observaciones del reporte');
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final inspectorId = await ApiService.getPersonalId();
      final String placa = (widget.reporteData['placa'] != null && widget.reporteData['placa'].toString().trim().isNotEmpty)
          ? widget.reporteData['placa'].toString().trim().toUpperCase()
          : '';

      List<String> fotosBase64 = [];
      if (widget.reporteData['fotos'] != null) {
        final List<XFile> receivedFotos = widget.reporteData['fotos'];
        for (var foto in receivedFotos) {
          final bytes = await foto.readAsBytes();
          fotosBase64.add(base64Encode(bytes));
        }
      }

      final fugaImagenes = widget.reporteData['fuga_imagenes'];
      if (fugaImagenes is List) {
        for (final path in fugaImagenes) {
          final file = File(path.toString());
          if (await file.exists()) {
            final bytes = await file.readAsBytes();
            fotosBase64.add(base64Encode(bytes));
          }
        }
      }

      await ApiService.createReporteIntervencion({
        'inspectorId': inspectorId,
        'placa': placa,
        'lugar': lugar,
        'observaciones': obs,
        'coordenadas': widget.reporteData['coordenadas'] ?? '',
        'fotos': fotosBase64,
        'infraccionesIds': _selectedInfraccionesIds.where((id) => id != null).toList(),
        'dni_conductor': widget.reporteData['dni_conductor'] ?? '',
        'nombres_conductor': widget.reporteData['nombres_conductor'] ?? '',
        'apellidos_conductor': widget.reporteData['apellidos_conductor'] ?? '',
        'dni_dueño': widget.reporteData['dni_dueño'] ?? '',
        'nombres_dueño': widget.reporteData['nombres_dueño'] ?? '',
        'apellidos_dueño': widget.reporteData['apellidos_dueño'] ?? '',
        'claseVehiculo': widget.reporteData['clase_vehiculo'] ?? '',
        'marcaVehiculo': widget.reporteData['marca_vehiculo'] ?? '',
        'colorVehiculo': widget.reporteData['color_vehiculo'] ?? '',
        'motorVehiculo': widget.reporteData['chasis'] ?? '',
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reporte enviado a administración para revisión.'), backgroundColor: Colors.green),
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } catch (e) {
      _showError('Error al guardar reporte: $e');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showError(String msg) {
    final cleanMsg = msg.replaceAll('Exception: ', '');
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(cleanMsg), backgroundColor: Colors.red));
  }

  @override
  void dispose() {
    _signatureController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String identificador = widget.reporteData['placa'] ?? '';
    if (identificador.isEmpty) identificador = widget.reporteData['chasis'] ?? '';
    if (identificador.isEmpty) identificador = 'SIN PLACA';
    final bool permisoVerificado = _permitePapeletaMovil != null;
    final bool permitePapeleta = _permitePapeletaMovil == true;
    final Color accentColor = permitePapeleta ? Colors.red.shade700 : AppTheme.primaryBlue;
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(!permisoVerificado ? 'Cargando...' : permitePapeleta ? 'Generar Papeleta' : 'Registrar Evidencia', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: AppTheme.primaryBlue,
        iconTheme: const IconThemeData(color: Colors.white),
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
                      border: Border.all(color: accentColor.withOpacity(0.25), width: 2),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          permitePapeleta ? 'Vehículo a sancionar' : 'Vehículo reportado',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          identificador,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.black87),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Conductor: ${widget.reporteData['nombres_conductor']} ${widget.reporteData['apellidos_conductor']}',
                          style: TextStyle(color: accentColor, fontWeight: FontWeight.bold),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  if (!permitePapeleta) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        border: Border.all(color: Colors.amber.shade400),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.amber.shade800),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Text(
                              'El vehículo no tiene placa registrada. Las infracciones se guardarán como evidencia y serán verificadas por la administración.',
                              style: TextStyle(color: Colors.black87, fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

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
                  
                  const SizedBox(height: 16),
                  if (permitePapeleta)
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        'TOTAL DE PAPELETA: S/ $_montoTotal',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                    ),

                  const SizedBox(height: 16),

                  const SizedBox(height: 32),
                  if (permitePapeleta) ...[
                  _buildSectionTitle('Firma del Conductor Actual'),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF1E3A8A).withOpacity(0.3), width: 2),
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
                    onPressed: _isSubmitting ? null : _submitReportAndTicket,
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

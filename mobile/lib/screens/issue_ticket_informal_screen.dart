import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
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
  List<dynamic> _tiposInfraccion = [];
  
  // Lista dinámica de infracciones seleccionadas
  final List<String?> _selectedInfraccionesIds = [null];
  
  String _lugar = '';
  String _observaciones = '';

  @override
  void initState() {
    super.initState();
    _loadTiposInfraccion();
    if (widget.reporteData['fuga_direccion'] != null) {
      _lugar = widget.reporteData['fuga_direccion'];
    }
    if (widget.reporteData['fuga_observaciones'] != null && widget.reporteData['fuga_observaciones'].toString().isNotEmpty) {
      _observaciones = 'FUGA DEL CONDUCTOR. ${widget.reporteData['fuga_observaciones']}';
    } else if (widget.reporteData['fuga'] == true) {
      _observaciones = 'FUGA DEL CONDUCTOR.';
    }
  }

  Future<void> _loadTiposInfraccion() async {
    try {
      final response = await ApiService.getTiposInfraccion();
      setState(() {
        _tiposInfraccion = response;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error cargando infracciones: $e')),
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

      final requestData = {
        'vehiculoPlaca': placa,
        'claseVehiculo': widget.reporteData['clase_vehiculo'] ?? '',
        'marcaVehiculo': widget.reporteData['marca_vehiculo'] ?? '',
        'colorVehiculo': widget.reporteData['color_vehiculo'] ?? '',
        'motorVehiculo': widget.reporteData['motor_vehiculo'] ?? '',
        'infractor': widget.reporteData['fuga'] == true ? 'CONDUCTOR FUGADO / DUEÑO' : (conductorNombre.trim().isEmpty ? 'CONDUCTOR NO IDENTIFICADO' : conductorNombre),
        'conductorDni': widget.reporteData['dni_conductor'] ?? '',
        'conductorNombres': widget.reporteData['nombres_conductor'] ?? '',
        'conductorApellidos': widget.reporteData['apellidos_conductor'] ?? '',
        'duenoDni': widget.reporteData['dni_dueno'] ?? '',
        'duenoNombres': widget.reporteData['nombres_dueno'] ?? '',
        'duenoApellidos': widget.reporteData['apellidos_dueno'] ?? '',
        'lugar': _lugar,
        'infraccionesIds': infraccionesInts,
        'observacionesAutoridad': _observaciones,
        'id_inspector': inspectorId,
        'fuga': widget.reporteData['fuga'] ?? false,
        'fugaLatitud': widget.reporteData['fuga_latitud'],
        'fugaLongitud': widget.reporteData['fuga_longitud'],
        // 'fugaImagenes': widget.reporteData['fuga_imagenes'], // Pendiente de implementación en backend
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
          const SnackBar(content: Text('¡Reporte informal y multas generados con éxito!'), backgroundColor: Colors.green),
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
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }

  @override
  void dispose() {
    _signatureController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String identificador = widget.reporteData['placa'] ?? widget.reporteData['chasis'] ?? 'Sin ID';
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Multar Vehículo Informal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
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
                      border: Border.all(color: Colors.red.shade200, width: 2),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Vehículo a Sancionar (Informal)',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          identificador,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.black87),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Conductor: ${widget.reporteData['nombres_conductor']} ${widget.reporteData['apellidos_conductor']}',
                          style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  
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
                                        labelText: 'Multa ${index + 1}',
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
                          label: const Text('Añadir otra multa', style: TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.bold)),
                        )
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      'TOTAL A PAGAR: S/ $_montoTotal',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                  ),

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
                          initialValue: _lugar,
                          decoration: InputDecoration(
                            labelText: 'Lugar de Intervención',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            prefixIcon: const Icon(Icons.location_on, color: Colors.grey),
                          ),
                          onChanged: (val) => _lugar = val,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          initialValue: _observaciones,
                          decoration: InputDecoration(
                            labelText: 'Observaciones',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            alignLabelWithHint: true,
                          ),
                          maxLines: 3,
                          onChanged: (val) => _observaciones = val,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),
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
                      backgroundColor: Colors.red.shade700,
                      foregroundColor: Colors.white,
                      elevation: 5,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    icon: _isSubmitting ? const SizedBox() : const Icon(Icons.gavel),
                    label: _isSubmitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Guardar Reporte y Multas', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
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

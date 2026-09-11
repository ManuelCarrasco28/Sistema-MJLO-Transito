import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import '../services/api_service.dart';
import '../theme.dart';

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
  bool _isSubmitting = false;
  List<dynamic> _tiposInfraccion = [];
  
  // Lista dinámica de infracciones seleccionadas
  final List<String?> _selectedInfraccionesIds = [null];
  
  String _lugar = '';
  String _observaciones = '';

  // Datos del Conductor (si es distinto al dueño)
  bool _conductorEsDueno = true;
  final _dniConductor = TextEditingController();
  final _nombresConductor = TextEditingController();
  final _apellidosConductor = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTiposInfraccion();
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

  Future<void> _submitTicket() async {
    final validInfracciones = _selectedInfraccionesIds.where((id) => id != null).toList();

    if (validInfracciones.isEmpty) {
      _showError('Seleccione al menos un tipo de infracción');
      return;
    }

    if (!_conductorEsDueno && (_dniConductor.text.isEmpty || _nombresConductor.text.isEmpty)) {
      _showError('Complete los datos del conductor');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final inspectorId = await ApiService.getPersonalId();

      final List<int> infraccionesInts = validInfracciones.map((e) => int.parse(e!)).toList();

      String conductorNombre = _conductorEsDueno 
          ? (widget.vehicleData['propietario'] ?? 'Dueño')
          : '${_nombresConductor.text.trim()} ${_apellidosConductor.text.trim()}';
      String conductorDni = _conductorEsDueno
          ? (widget.vehicleData['propietarioDni'] ?? '').toString()
          : _dniConductor.text.trim();
      String conductorNombres = _conductorEsDueno
          ? (widget.vehicleData['propietarioNombres'] ?? conductorNombre).toString()
          : _nombresConductor.text.trim();
      String conductorApellidos = _conductorEsDueno
          ? '${widget.vehicleData['propietarioPaterno'] ?? ''} ${widget.vehicleData['propietarioMaterno'] ?? ''}'.trim()
          : _apellidosConductor.text.trim();

      final requestData = {
        'vehiculoPlaca': widget.vehicleData['placa'] ?? widget.vehicleData['chasis'],
        'infractor': conductorNombre,
        'conductorDni': conductorDni,
        'conductorNombres': conductorNombres,
        'conductorApellidos': conductorApellidos,
        'lugar': _lugar,
        'infraccionesIds': infraccionesInts,
        'observacionesAutoridad': _observaciones,
        'inspectorId': inspectorId,
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
        Navigator.pop(context); // Volver al detalle
      }
    } catch (e) {
      _showError('Error al generar papeleta: $e');
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
    _dniConductor.dispose();
    _nombresConductor.dispose();
    _apellidosConductor.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String identificador = widget.vehicleData['placa'] ?? widget.vehicleData['chasis'] ?? 'Sin ID';
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Generar Multa Oficial', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(12)),
                    child: SwitchListTile(
                      title: const Text('El dueño está conduciendo', style: TextStyle(fontWeight: FontWeight.bold)),
                      value: _conductorEsDueno,
                      activeColor: Colors.orange.shade700,
                      onChanged: (val) => setState(() => _conductorEsDueno = val),
                    ),
                  ),
                  if (!_conductorEsDueno) ...[
                    const SizedBox(height: 16),
                    _buildTextField(_dniConductor, 'DNI del Conductor actual', Icons.badge, TextInputType.number),
                    const SizedBox(height: 12),
                    _buildTextField(_nombresConductor, 'Nombres', Icons.person, TextInputType.name),
                    const SizedBox(height: 12),
                    _buildTextField(_apellidosConductor, 'Apellidos', Icons.person_outline, TextInputType.name),
                  ],

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
                                      items: _tiposInfraccion.map((tipo) {
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

                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: ElevatedButton.icon(
                      onPressed: _isSubmitting ? null : _submitTicket,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.shade700,
                        foregroundColor: Colors.white,
                        elevation: 5,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      icon: _isSubmitting ? const SizedBox() : const Icon(Icons.gavel),
                      label: _isSubmitting
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Emitir Multas Oficiales', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, TextInputType type) {
    return TextField(
      controller: controller,
      keyboardType: type,
      textCapitalization: TextCapitalization.characters,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.grey.shade600),
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

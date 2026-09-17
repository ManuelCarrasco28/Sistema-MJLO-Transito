import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme.dart';

class PersonHistoryScreen extends StatefulWidget {
  final String dni;
  final String nombre;

  const PersonHistoryScreen({super.key, required this.dni, required this.nombre});

  @override
  State<PersonHistoryScreen> createState() => _PersonHistoryScreenState();
}

class _PersonHistoryScreenState extends State<PersonHistoryScreen> {
  List<dynamic> _papeletasDueno = [];
  List<dynamic> _papeletasConductor = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final papeletas = await ApiService.getPapeletas();
      
      final duenoList = papeletas.where((p) => p['propietarioDni']?.toString().trim() == widget.dni).toList();
      final conductorList = papeletas.where((p) => p['conductorDni']?.toString().trim() == widget.dni).toList();

      if (mounted) {
        setState(() {
          _papeletasDueno = duenoList;
          _papeletasConductor = conductorList;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _papeletasDueno = [];
          _papeletasConductor = [];
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppTheme.backgroundLight,
        appBar: AppBar(
          title: const Text('Historial de Infracciones', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          backgroundColor: AppTheme.primaryBlue,
          iconTheme: const IconThemeData(color: Colors.white),
          bottom: const TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: Colors.orange,
            tabs: [
              Tab(text: 'Dueño (A Pagar)'),
              Tab(text: 'Conductor (Intervenido)'),
            ],
          ),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue))
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    color: Colors.white,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Historial de:', style: TextStyle(color: Colors.grey, fontSize: 14)),
                        const SizedBox(height: 4),
                        Text(widget.nombre, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryBlue)),
                        Text('DNI: ${widget.dni}', style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: TabBarView(
                      children: [
                        _buildList(_papeletasDueno, 'No tiene papeletas como dueño'),
                        _buildList(_papeletasConductor, 'No tiene intervenciones como conductor'),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildList(List<dynamic> list, String emptyMessage) {
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.thumb_up_alt_outlined, size: 64, color: Colors.green.shade400),
            const SizedBox(height: 16),
            Text(emptyMessage, style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final data = list[index];
        final isFormal = data['tipoInfractor'] == 'FORMAL';
        final numPapeleta = data['numeroPapeleta'] ?? 'N° ${data['id'].toString().padLeft(6, '0')}';
        final identificador = data['vehiculoPlaca'] ?? 'Sin placa';
        
        final estado = data['estado'] ?? 'PENDIENTE';
        final isPagada = estado.toString().toUpperCase() == 'PAGADA' || estado.toString().toUpperCase() == 'PAGADO';

        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: isPagada ? Colors.green.shade200 : Colors.red.shade200),
          ),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isPagada ? Colors.green.shade50 : Colors.red.shade50,
              child: Icon(
                isPagada ? Icons.check_circle : Icons.warning_rounded,
                color: isPagada ? Colors.green.shade700 : Colors.red.shade700,
              ),
            ),
            title: Text('${isFormal ? "Formal" : "Informal"} - $numPapeleta', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Vehículo: $identificador\nMonto: S/ ${data['montoTotal'] ?? 0}\nEstado: $estado'),
            isThreeLine: true,
            trailing: TextButton.icon(
              icon: const Icon(Icons.visibility, size: 18),
              label: const Text('Ver'),
              style: TextButton.styleFrom(foregroundColor: AppTheme.primaryBlue),
              onPressed: () => _showDetails(context, data, isFormal, identificador),
            ),
          ),
        );
      },
    );
  }

  void _showDetails(BuildContext context, dynamic data, bool isFormal, String identificador) {
    showDialog(
      context: context,
      builder: (context) {
        final numPapeleta = data['numeroPapeleta'] ?? 'N° ${data['id'].toString().padLeft(6, '0')}';
        
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Detalles de la Papeleta', style: TextStyle(color: isFormal ? Colors.blue.shade800 : Colors.red.shade800, fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDetailRow('Papeleta:', numPapeleta, isBold: true),
                _buildDetailRow('Vehículo:', '$identificador (${isFormal ? "Formal" : "Informal"})'),
                if (isFormal && data['vehiculoAsociacion'] != null)
                  _buildDetailRow('Asociación:', data['vehiculoAsociacion']),
                _buildDetailRow('Lugar:', data['lugar'] ?? 'No especificado'),
                _buildDetailRow('Obs. Inspector:', data['observacionesAutoridad'] ?? 'Ninguna'),
                _buildDetailRow('Obs. Conductor:', data['observacionesConductor'] ?? 'Ninguna'),
                const Divider(height: 24),
                _buildDetailRow('Conductor:', '${data['conductorNombre'] ?? 'No identificado'}\nDNI: ${data['conductorDni'] ?? 'S/D'}'),
                const SizedBox(height: 8),
                _buildDetailRow('Dueño:', '${data['propietarioNombre'] ?? 'No identificado'}\nDNI: ${data['propietarioDni'] ?? 'S/D'}'),
                const Divider(height: 24),
                _buildDetailRow('Infracción:', '${data['tipoInfraccionCodigo']} - ${data['tipoInfraccionGravedad']}'),
                _buildDetailRow('Monto Total:', 'S/ ${data['montoTotal']}', isBold: true),
                _buildDetailRow('Estado:', data['estado'] ?? 'PENDIENTE_PAGO'),
                const SizedBox(height: 12),
                if (data['firmaConductorImg'] != null) ...[
                  const Text('Firma del Conductor:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300)),
                    child: data['firmaConductorImg'].toString().startsWith('data:image')
                        ? Image.memory(
                            base64Decode(data['firmaConductorImg'].toString().split(',').last),
                            height: 100,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => const Text('Error al cargar la firma'),
                          )
                        : Image.network(
                            '${ApiService.fileBaseUrl}/${data['firmaConductorImg']}',
                            height: 100,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => const Text('Error al cargar la firma'),
                          ),
                  ),
                ]
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cerrar'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
          ),
          Expanded(
            child: Text(value, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal, fontSize: 14)),
          ),
        ],
      ),
    );
  }
}

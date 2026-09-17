import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _papeletasOficiales = [];
  List<dynamic> _reportesInformales = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final papeletas = await ApiService.getPapeletas();

      List<dynamic> formales = [];
      List<dynamic> informales = [];

      for (var p in papeletas) {
        if (p['tipoInfractor'] == 'FORMAL') {
          formales.add(p);
        } else {
          informales.add(p);
        }
      }

      setState(() {
        _papeletasOficiales = formales;
        _reportesInformales = informales;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _papeletasOficiales = [];
          _reportesInformales = [];
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
          title: const Text('Historial de Actividades', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          backgroundColor: AppTheme.primaryBlue,
          iconTheme: const IconThemeData(color: Colors.white),
          bottom: const TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: AppTheme.accentYellow,
            tabs: [
              Tab(icon: Icon(Icons.receipt_long), text: 'Formales'),
              Tab(icon: Icon(Icons.report_problem), text: 'Informales'),
            ],
          ),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue))
            : TabBarView(
                children: [
                  _buildList(_papeletasOficiales, true),
                  _buildList(_reportesInformales, false),
                ],
              ),
      ),
    );
  }

  Widget _buildList(List<dynamic> list, bool isFormal) {
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isFormal ? Icons.receipt_long : Icons.report_problem, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No hay actividades registradas', style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final data = list[index];
        final numPapeleta = data['numeroPapeleta'] ?? 'N° ${data['id'].toString().padLeft(6, '0')}';
        final identificador = data['vehiculoPlaca'] ?? 'Sin placa';

        if (isFormal) {
          return Card(
            elevation: 2,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.blue.shade100)),
            child: ListTile(
              leading: CircleAvatar(backgroundColor: Colors.blue.shade100, child: Icon(Icons.receipt_long, color: Colors.blue.shade700)),
              title: Text('Formal - $numPapeleta', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Vehículo: $identificador\nMonto Total: S/ ${data['montoTotal']}'),
              isThreeLine: true,
              trailing: TextButton.icon(
                icon: const Icon(Icons.visibility, size: 18),
                label: const Text('Ver'),
                style: TextButton.styleFrom(foregroundColor: Colors.blue.shade700),
                onPressed: () => _showDetails(context, data, true, identificador),
              ),
            ),
          );
        } else {
          return Card(
            elevation: 2,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.red.shade100)),
            child: ListTile(
              leading: CircleAvatar(backgroundColor: Colors.red.shade100, child: Icon(Icons.report_problem, color: Colors.red.shade700)),
              title: Text('Informal - $numPapeleta', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Vehículo: $identificador\nMonto Total: S/ ${data['montoTotal'] ?? 0}'),
              isThreeLine: true,
              trailing: TextButton.icon(
                icon: const Icon(Icons.visibility, size: 18),
                label: const Text('Ver'),
                style: TextButton.styleFrom(foregroundColor: Colors.red.shade700),
                onPressed: () => _showDetails(context, data, false, identificador),
              ),
            ),
          );
        }
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

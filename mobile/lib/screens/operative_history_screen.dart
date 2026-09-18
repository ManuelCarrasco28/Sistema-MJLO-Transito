import 'package:flutter/material.dart';
import '../theme.dart';

class OperativeHistoryScreen extends StatelessWidget {
  final Map<String, dynamic> operativo;
  final List<dynamic> actividades;

  const OperativeHistoryScreen({
    super.key,
    required this.operativo,
    required this.actividades,
  });

  @override
  Widget build(BuildContext context) {
    // Filtrar actividades por este operativo
    final acts = actividades.where((a) => a['operativoId'] == operativo['id']).toList();

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text(operativo['nombre'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: AppTheme.primaryBlue,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: acts.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.list_alt, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  Text('No hay actividades en este operativo', style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 80),
              itemCount: acts.length,
              itemBuilder: (context, index) {
                final data = acts[index];
                final esReporte = data['es_reporte'] == true;
                
                final numDoc = esReporte ? 'REP N° ${data['id']}' : (data['numeroPapeleta'] ?? 'PAP N° ${data['id']}');
                final identificador = esReporte ? (data['placa_visual'] ?? 'Sin placa') : (data['vehiculoPlaca'] ?? 'Sin placa');
                
                final isFormal = !esReporte && data['tipoInfractor'] == 'FORMAL';
                
                Color cardColor;
                Color avatarBgColor;
                IconData iconData;
                String tipoTexto;
                
                if (esReporte) {
                  cardColor = Colors.orange;
                  avatarBgColor = Colors.orange.shade100;
                  iconData = Icons.help_outline;
                  tipoTexto = 'Sin Identificar (Reporte)';
                } else if (isFormal) {
                  cardColor = Colors.blue;
                  avatarBgColor = Colors.blue.shade100;
                  iconData = Icons.receipt_long;
                  tipoTexto = 'Formal (Infracción)';
                } else {
                  cardColor = Colors.red;
                  avatarBgColor = Colors.red.shade100;
                  iconData = Icons.report_problem;
                  tipoTexto = 'Informal (Infracción)';
                }

                final montoText = esReporte ? '' : '\nMonto Total: S/ ${data['montoTotal'] ?? 0}';

                return Card(
                  elevation: 2,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: avatarBgColor)),
                  child: ListTile(
                    leading: CircleAvatar(backgroundColor: avatarBgColor, child: Icon(iconData, color: cardColor)),
                    title: Text('$tipoTexto - $numDoc', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: Text('Vehículo: $identificador$montoText'),
                    isThreeLine: true,
                    trailing: TextButton.icon(
                      icon: const Icon(Icons.visibility, size: 18),
                      label: const Text('Ver'),
                      style: TextButton.styleFrom(foregroundColor: cardColor),
                      onPressed: () => _showDetails(context, data, isFormal, esReporte, identificador),
                    ),
                  ),
                );
              },
            ),
    );
  }

  void _showDetails(BuildContext context, dynamic data, bool isFormal, bool esReporte, String identificador) {
    showDialog(
      context: context,
      builder: (context) {
        final numDoc = esReporte ? 'REP N° ${data['id']}' : (data['numeroPapeleta'] ?? 'PAP N° ${data['id']}');
        
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Detalles de la Actividad', style: TextStyle(color: esReporte ? Colors.orange.shade800 : (isFormal ? Colors.blue.shade800 : Colors.red.shade800), fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDetailRow('Documento:', numDoc, isBold: true),
                _buildDetailRow('Vehículo:', '$identificador (${esReporte ? "Sin identificar" : (isFormal ? "Formal" : "Informal")})'),
                if (!esReporte && isFormal && data['vehiculoAsociacion'] != null)
                  _buildDetailRow('Asociación:', data['vehiculoAsociacion']),
                _buildDetailRow('Lugar:', data['lugar'] ?? 'No especificado'),
                if (!esReporte)
                  _buildDetailRow('Obs. Inspector:', data['observacionesAutoridad'] ?? 'Ninguna'),
                if (esReporte)
                  _buildDetailRow('Observaciones:', data['observaciones'] ?? 'Ninguna'),
                _buildDetailRow('Obs. Conductor:', data['observacionesConductor'] ?? 'Ninguna'),
                const Divider(height: 24),
                if (!esReporte)
                  _buildDetailRow('Conductor:', '${data['conductorNombre'] ?? 'No identificado'}\nDNI: ${data['conductorDni'] ?? 'S/D'}'),
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
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black54)),
          ),
          Expanded(
            flex: 3,
            child: Text(value, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal, color: Colors.black87)),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'dart:convert';
import '../services/api_service.dart';
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
                
                final isFormal = data['tipoInfractor'] == 'FORMAL';
                
                final placa = (data['vehiculoPlaca']?.toString() ?? data['placa_visual']?.toString() ?? '');
                final isSinPlaca = placa.isEmpty || placa.startsWith('SIN-PLACA') || placa == 'SIN PLACA' || placa == 'Sin placa';
                final esSinIdentificar = isSinPlaca;
                Color cardColor;
                Color avatarBgColor;
                IconData iconData;
                String tipoTexto;
                
                if (esSinIdentificar) {
                  cardColor = Colors.orange;
                  avatarBgColor = Colors.orange.shade100;
                  iconData = Icons.help_outline;
                  tipoTexto = esReporte ? 'Sin Identificar (Reporte)' : 'Sin Identificar (Infracción)';
                } else if (isFormal) {
                  cardColor = Colors.blue;
                  avatarBgColor = Colors.blue.shade100;
                  iconData = Icons.receipt_long;
                  tipoTexto = esReporte ? 'Formal (Reporte)' : 'Formal (Infracción)';
                } else {
                  cardColor = Colors.red;
                  avatarBgColor = Colors.red.shade100;
                  iconData = Icons.report_problem;
                  tipoTexto = esReporte ? 'Informal (Reporte)' : 'Informal (Infracción)';
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
        
        final placaForCheck = (data['vehiculoPlaca']?.toString() ?? data['placa_visual']?.toString() ?? '');
        final isSinPlaca = placaForCheck.isEmpty || placaForCheck.startsWith('SIN-PLACA') || placaForCheck == 'SIN PLACA' || placaForCheck == 'Sin placa';
        final esSinIdentificar = isSinPlaca;

        final tipoTextoVehiculo = isSinPlaca ? "Sin identificar" : (isFormal ? "Formal" : "Informal");

        final propDniText = (data['propietarioDni'] != null && data['propietarioDni'].toString().trim().isNotEmpty && data['propietarioDni'] != 'S/D')
            ? '\nN° Doc: ${data['propietarioDni']}'
            : '';
            
        final condDniText = (data['conductorDni'] != null && data['conductorDni'].toString().trim().isNotEmpty && data['conductorDni'] != 'S/D')
            ? '\nN° Doc: ${data['conductorDni']}'
            : '';

        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Detalles de la Actividad', style: TextStyle(color: esSinIdentificar ? Colors.orange.shade800 : (isFormal ? Colors.blue.shade800 : Colors.red.shade800), fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDetailRow('Documento:', numDoc, isBold: true),
                _buildDetailRow('Vehículo:', '$identificador ($tipoTextoVehiculo)'),
                if (!esReporte && isFormal && data['vehiculoAsociacion'] != null)
                  _buildDetailRow('Asociación:', data['vehiculoAsociacion']),
                _buildDetailRow('Lugar:', data['lugar'] ?? 'No especificado'),
                if (!esReporte)
                  _buildFormattedObservaciones('Obs. Inspector:', data['observacionesAutoridad'] ?? 'Ninguna'),
                if (esReporte)
                  _buildFormattedObservaciones('Observaciones:', data['observaciones'] ?? 'Ninguna'),
                if ((data['observacionesConductor'] != null && data['observacionesConductor'].toString().trim().isNotEmpty) ||
                    (data['observaciones_conductor'] != null && data['observaciones_conductor'].toString().trim().isNotEmpty))
                  _buildFormattedObservaciones('Obs. Conductor:', (data['observacionesConductor'] ?? data['observaciones_conductor']).toString()),
                const Divider(height: 24),
                if (data['conductorNombre'] != null && data['conductorNombre'].toString().trim().isNotEmpty)
                  _buildDetailRow('Conductor:', '${data['conductorNombre']}$condDniText')
                else
                  _buildDetailRow('Conductor:', 'No identificado'),
                if (!isSinPlaca) ...[
                  const SizedBox(height: 8),
                  if (data['propietarioNombre'] != null && data['propietarioNombre'].toString().trim().isNotEmpty)
                    _buildDetailRow('Dueño:', '${data['propietarioNombre']}$propDniText')
                  else
                    _buildDetailRow('Dueño:', 'No identificado'),
                ],
                const Divider(height: 24),
                
                if (!esReporte) ...[
                  if (data['detalles'] != null && (data['detalles'] as List).isNotEmpty)
                    ...((data['detalles'] as List).map((det) => _buildDetailRow('Infracción:', '${det['codigo']} - ${det['gravedad']}')))
                  else
                    _buildDetailRow('Infracción:', '${data['tipoInfraccionCodigo'] ?? ''} - ${data['tipoInfraccionGravedad'] ?? ''}'),
                  _buildDetailRow('Monto Total:', 'S/ ${data['montoTotal']}', isBold: true),
                ],
                _buildDetailRow('Estado:', (data['estado'] ?? (esReporte ? 'PENDIENTE' : 'PENDIENTE_PAGO')).toString().replaceAll('_', ' ')),
                const SizedBox(height: 12),
                if (!esReporte && data['firmaConductorImg'] != null) ...[
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
                            ApiService.urlArchivo(data['firmaConductorImg'].toString()),
                            headers: ApiService.headersImagen,
                            height: 100,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => const Text('Error al cargar la firma'),
                          ),
                  ),
                ],
                if (data['fotos'] != null) ...() {
                  List<dynamic> fotosList = [];
                  if (data['fotos'] is List) {
                    fotosList = data['fotos'];
                  } else if (data['fotos'] is String) {
                    try { fotosList = jsonDecode(data['fotos']); } catch (_) {}
                  }
                  if (fotosList.isEmpty) return <Widget>[];
                  
                  return [
                    const Divider(height: 24),
                    const Text('Fotos de Evidencia:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 120,
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: fotosList.map((fotoInfo) {
                            final fotoUrl = fotoInfo is Map ? fotoInfo['foto'] : fotoInfo;
                            if (fotoUrl == null) return const SizedBox();
                            final String urlStr = fotoUrl.toString();
                            return Padding(
                              padding: const EdgeInsets.only(right: 8.0),
                              child: Container(
                                decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300)),
                                child: urlStr.startsWith('data:image')
                                    ? Image.memory(
                                        base64Decode(urlStr.split(',').last),
                                        height: 100,
                                        width: 100,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) => const Text('Error al cargar'),
                                      )
                                    : Image.network(
                                        ApiService.urlArchivo(fotoUrl.toString()),
                                        headers: ApiService.headersImagen,
                                        height: 100,
                                        width: 100,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) => const Text('Error al cargar'),
                                      ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ];
                }(),
              ],
            ),
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: esSinIdentificar ? Colors.orange.shade800 : (isFormal ? Colors.blue.shade800 : Colors.red.shade800),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              child: const Text('Cerrar', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 115,
            padding: const EdgeInsets.only(right: 8),
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.black54, fontSize: 13)),
          ),
          Expanded(
            child: Text(
              value, 
              style: TextStyle(
                fontWeight: isBold ? FontWeight.w700 : FontWeight.w500, 
                color: isBold ? Colors.black : Colors.black87, 
                fontSize: 14,
                height: 1.3,
              )
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFormattedObservaciones(String label, String value) {
    if (!value.contains('[DATOS REPORTADOS]')) {
      return _buildDetailRow(label, value);
    }

    final parts = value.split('[DATOS REPORTADOS]');
    final obsNormal = parts[0].trim();
    final datosReportados = parts.length > 1 ? parts[1].trim() : '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (obsNormal.isNotEmpty) _buildDetailRow(label, obsNormal),
          if (datosReportados.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('DATOS REPORTADOS', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
                  const SizedBox(height: 4),
                  Text(datosReportados, style: const TextStyle(color: Colors.black87)),
                ],
              ),
            ),
          ]
        ],
      ),
    );
  }
}

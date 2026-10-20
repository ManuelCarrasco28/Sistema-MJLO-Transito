import 'package:flutter/material.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../theme.dart';
import 'issue_ticket_screen.dart';

class OperativeHistoryScreen extends StatelessWidget {
  final Map<String, dynamic> operativo;
  final List<dynamic> actividades;

  const OperativeHistoryScreen({
    super.key,
    required this.operativo,
    required this.actividades,
  });

  String _formatTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return '--:--';
    final parts = timeStr.split(':');
    if (parts.length >= 2) {
      int? hour = int.tryParse(parts[0]);
      int? minute = int.tryParse(parts[1]);
      if (hour != null && minute != null) {
        final period = hour >= 12 ? 'pm' : 'am';
        int hour12 = hour % 12;
        if (hour12 == 0) hour12 = 12;
        final hourStr = hour12.toString().padLeft(2, '0');
        final minStr = minute.toString().padLeft(2, '0');
        return '$hourStr:$minStr $period';
      }
      return '${parts[0].padLeft(2, '0')}:${parts[1].padLeft(2, '0')}';
    }
    return timeStr;
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final parts = dateStr.split('-');
      if (parts.length == 3) {
        return '${parts[2]}/${parts[1]}/${parts[0]}';
      }
    } catch (_) {}
    return dateStr;
  }

  @override
  Widget build(BuildContext context) {
    final String opIdStr = operativo['id']?.toString() ?? '';
    final acts = actividades.where((a) => a['operativoId']?.toString() == opIdStr).toList();

    final String nombre = operativo['nombre']?.toString() ?? 'Operativo';
    final String lugar = operativo['lugar']?.toString() ?? '';
    final String fecha = _formatDate(operativo['fecha']?.toString());
    final String horaInicio = _formatTime(operativo['hora_inicio']?.toString());
    final String horaFin = _formatTime(operativo['hora_fin']?.toString());
    final String estado = operativo['estado']?.toString().toUpperCase() ?? '';
    final bool fueCancelado = estado == 'CANCELADO' || (operativo['hora_cancelacion'] != null && operativo['hora_cancelacion'].toString().isNotEmpty);
    final String horaCorte = _formatTime(operativo['hora_cancelacion']?.toString());

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text(nombre, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: AppTheme.primaryBlue,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: fueCancelado ? Colors.orange.shade200 : Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (lugar.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Icon(Icons.location_on_outlined, size: 16, color: Colors.grey.shade700),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Lugar: $lugar',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade800),
                          ),
                        ),
                        if (fecha.isNotEmpty)
                          Text(fecha, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                Row(
                  children: [
                    Icon(Icons.access_time, size: 16, color: Colors.grey.shade700),
                    const SizedBox(width: 6),
                    Text(
                      'Horario programado: $horaInicio a $horaFin',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade800),
                    ),
                  ],
                ),
                if (fueCancelado) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.stop_circle_outlined, size: 16, color: Colors.orange.shade900),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            horaCorte != '--:--'
                                ? 'Terminado antes de tiempo a las $horaCorte (Reportes e infracciones registrados se conservan)'
                                : 'Terminado antes de tiempo (Actividades válidas y registradas)',
                            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.orange.shade900),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          Expanded(
            child: acts.isEmpty
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
                    padding: const EdgeInsets.only(left: 12, right: 12, bottom: 80),
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
                final int segTolerancia = int.tryParse(data['segundosRestantesTolerancia']?.toString() ?? '') ?? 0;
                final bool puedeEditar = (data['puedeEditar'] == true || data['puedeEditar'] == 1 || data['puedeEditar'] == '1') && segTolerancia > 0;

                return Card(
                  elevation: 2,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: avatarBgColor)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      leading: CircleAvatar(backgroundColor: avatarBgColor, child: Icon(iconData, color: cardColor)),
                      title: Text('$tipoTexto - $numDoc', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Vehículo: $identificador$montoText'),
                          if (puedeEditar) ...[
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFF3E0),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFFFB74D)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.timer_outlined, size: 13, color: Color(0xFFE65100)),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Tolerancia activa: ${(segTolerancia ~/ 60)}:${(segTolerancia % 60).toString().padLeft(2, '0')} para corregir',
                                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFFBF360C)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                      isThreeLine: true,
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (puedeEditar)
                            Padding(
                              padding: const EdgeInsets.only(right: 4.0),
                              child: TextButton.icon(
                                icon: const Icon(Icons.edit_note_rounded, size: 18),
                                label: Text(
                                  '${(segTolerancia ~/ 60)}:${(segTolerancia % 60).toString().padLeft(2, '0')}',
                                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                                ),
                                style: TextButton.styleFrom(
                                  foregroundColor: const Color(0xFFBF360C),
                                  backgroundColor: const Color(0xFFFFF3E0),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: Color(0xFFFFB74D))),
                                ),
                                onPressed: () => _abrirModificar(context, data, esReporte),
                              ),
                            ),
                          TextButton.icon(
                            icon: const Icon(Icons.visibility, size: 18),
                            label: const Text('Ver'),
                            style: TextButton.styleFrom(foregroundColor: cardColor),
                            onPressed: () => _showDetails(context, data, isFormal, esReporte, identificador),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showDetails(BuildContext context, dynamic data, bool isFormal, bool esReporte, String identificador) {
    showDialog(
      context: context,
      builder: (context) {
        final int segTolerancia = int.tryParse(data['segundosRestantesTolerancia']?.toString() ?? '') ?? 0;
        final bool puedeEditar = (data['puedeEditar'] == true || data['puedeEditar'] == 1 || data['puedeEditar'] == '1') && segTolerancia > 0;
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

        final rawFechaHora = data['fecha_hora'] ?? data['fechaHora'] ?? data['fecha'] ?? data['fechaRegistro'];
        String fechaTexto = '';
        String horaTexto = '';

        if (rawFechaHora != null && rawFechaHora.toString().trim().isNotEmpty) {
          final str = rawFechaHora.toString().trim();
          final dt = DateTime.tryParse(str);
          if (dt != null) {
            final dia = dt.day.toString().padLeft(2, '0');
            final mes = dt.month.toString().padLeft(2, '0');
            final anio = dt.year.toString();
            fechaTexto = '$dia/$mes/$anio';

            final period = dt.hour >= 12 ? 'pm' : 'am';
            int hour12 = dt.hour % 12;
            if (hour12 == 0) hour12 = 12;
            final hora = hour12.toString().padLeft(2, '0');
            final min = dt.minute.toString().padLeft(2, '0');
            horaTexto = '$hora:$min $period';
          } else {
            final parts = str.split(' ');
            if (parts.isNotEmpty) {
              final dParts = parts[0].split('-');
              if (dParts.length == 3) {
                fechaTexto = '${dParts[2]}/${dParts[1]}/${dParts[0]}';
              } else {
                fechaTexto = parts[0];
              }
            }
            if (parts.length > 1) {
              final tParts = parts[1].split(':');
              if (tParts.length >= 2) {
                int? h = int.tryParse(tParts[0]);
                int? m = int.tryParse(tParts[1]);
                if (h != null && m != null) {
                  final period = h >= 12 ? 'pm' : 'am';
                  int h12 = h % 12;
                  if (h12 == 0) h12 = 12;
                  horaTexto = '${h12.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')} $period';
                }
              }
            }
          }
        }

        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  'Detalles de la Actividad',
                  style: TextStyle(
                    color: esSinIdentificar
                        ? Colors.orange.shade800
                        : (isFormal ? Colors.blue.shade800 : Colors.red.shade800),
                    fontWeight: FontWeight.bold,
                    fontSize: 17,
                  ),
                ),
              ),
              if (fechaTexto.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(left: 8.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.calendar_today, size: 11, color: Colors.grey.shade700),
                            const SizedBox(width: 4),
                            Text(
                              fechaTexto,
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade800),
                            ),
                          ],
                        ),
                        if (horaTexto.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.access_time, size: 11, color: Colors.grey.shade700),
                              const SizedBox(width: 4),
                              Text(
                                horaTexto,
                                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Colors.grey.shade700),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (puedeEditar)
                  Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3E0),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFFB74D)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timer_outlined, size: 18, color: Color(0xFFE65100)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Tolerancia activa: ${(segTolerancia ~/ 60)}:${(segTolerancia % 60).toString().padLeft(2, '0')} para corregir datos',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFBF360C)),
                          ),
                        ),
                      ],
                    ),
                  ),
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
            if (puedeEditar)
              ElevatedButton.icon(
                icon: const Icon(Icons.edit_note_rounded, size: 18),
                label: Text('Modificar (${(segTolerancia ~/ 60)}:${(segTolerancia % 60).toString().padLeft(2, '0')})'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE65100),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                onPressed: () {
                  Navigator.pop(context);
                  _abrirModificar(context, data, esReporte);
                },
              ),
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

  Future<void> _abrirModificar(BuildContext context, dynamic data, bool esReporte) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => IssueTicketScreen(
          papeletaAEditar: esReporte ? null : Map<String, dynamic>.from(data),
          reporteAEditar: esReporte ? Map<String, dynamic>.from(data) : null,
        ),
      ),
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

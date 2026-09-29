import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'operative_history_screen.dart';

class HistoryScreen extends StatefulWidget {
  final String? filterPlaca;
  final String? filterDni;

  const HistoryScreen({super.key, this.filterPlaca, this.filterDni});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> with RouteAware {
  List<dynamic> _todasActividades = [];
  List<Map<String, dynamic>> _listaOperativos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void didPopNext() {
    // Se llama automáticamente cuando el usuario REGRESA a esta pantalla
    // (ej: después de generar un reporte o papeleta)
    _refresh();
  }

  void _refresh() {
    if (mounted) setState(() => _isLoading = true);
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final papeletas = await ApiService.getPapeletas(dni: widget.filterDni, placa: widget.filterPlaca);
      final reportes = await ApiService.getReportes(dni: widget.filterDni, placa: widget.filterPlaca);

      List<dynamic> todas = [];
      Map<String, Map<String, dynamic>> opsMap = {};

      for (var p in papeletas) {
        todas.add({...p, 'es_reporte': false});
        if (p['operativoId'] != null) {
          final opId = p['operativoId'].toString();
          opsMap[opId] = {
            'id': p['operativoId'],
            'nombre': p['operativoNombre'] ?? 'Operativo $opId',
          };
        }
      }
      
      for (var r in reportes) {
        todas.add({...r, 'es_reporte': true});
        if (r['operativoId'] != null) {
          final opId = r['operativoId'].toString();
          opsMap[opId] = {
            'id': r['operativoId'],
            'nombre': r['operativoNombre'] ?? 'Operativo $opId',
          };
        }
      }
      
      // Ordenar por fecha_hora descendente
      todas.sort((a, b) {
        final dateA = DateTime.tryParse(a['fecha_hora']?.toString() ?? a['fechaHora']?.toString() ?? '') ?? DateTime(2000);
        final dateB = DateTime.tryParse(b['fecha_hora']?.toString() ?? b['fechaHora']?.toString() ?? '') ?? DateTime(2000);
        return dateB.compareTo(dateA);
      });

      // Filtros ahora se aplican en el backend

      setState(() {
        _todasActividades = todas;
        _listaOperativos = opsMap.values.toList();
        _isLoading = false;
      });
    } catch (e, stacktrace) {
      debugPrint('Error en _loadHistory: $e');
      debugPrint('Stacktrace: $stacktrace');
      if (mounted) {
        setState(() {
          _todasActividades = [];
          _listaOperativos = [];
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
          actions: [
            IconButton(
              icon: _isLoading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.refresh, color: Colors.white),
              tooltip: 'Actualizar historial',
              onPressed: _isLoading ? null : _refresh,
            ),
          ],
          bottom: const TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: AppTheme.accentYellow,
            tabs: [
              Tab(icon: Icon(Icons.list_alt), text: 'Actividades'),
              Tab(icon: Icon(Icons.local_police), text: 'Operativos'),
            ],
          ),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue))
            : TabBarView(
                children: [
                  _buildListActividades(_todasActividades),
                  _buildListOperativos(),
                ],
              ),
      ),
    );
  }

  Widget _buildListOperativos() {
    if (_listaOperativos.isEmpty) {
      final String mensaje = (widget.filterDni != null || widget.filterPlaca != null)
          ? 'No registra intervenciones en operativos'
          : 'No participaste en ningún operativo';

      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_police, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(mensaje, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _listaOperativos.length,
      itemBuilder: (context, index) {
        final op = _listaOperativos[index];
        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: const CircleAvatar(backgroundColor: AppTheme.primaryBlue, child: Icon(Icons.local_police, color: Colors.white)),
            title: Text(op['nombre'], style: const TextStyle(fontWeight: FontWeight.bold)),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => OperativeHistoryScreen(
                    operativo: op,
                    actividades: _todasActividades,
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildListActividades(List<dynamic> list) {
    if (list.isEmpty) {
      final String mensaje = (widget.filterDni != null || widget.filterPlaca != null)
          ? 'No registra papeletas ni reportes'
          : 'No tienes actividades registradas';

      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.list_alt, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(mensaje, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 80),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final data = list[index];
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

        final opName = data['operativoNombre'] != null && data['operativoNombre'].toString().isNotEmpty 
            ? '\nOperativo: ${data['operativoNombre']}' 
            : '';
            
        final montoText = esReporte ? '' : '\nMonto Total: S/ ${data['montoTotal'] ?? 0}';

        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: avatarBgColor)),
          child: ListTile(
            leading: CircleAvatar(backgroundColor: avatarBgColor, child: Icon(iconData, color: cardColor)),
            title: Text('$tipoTexto - $numDoc', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: Text('Vehículo: $identificador$montoText$opName'),
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
    );
  }

  void _showDetails(BuildContext context, dynamic data, bool isFormal, bool esReporte, String identificador) {
    showDialog(
      context: context,
      builder: (context) {
        final numDoc = esReporte ? 'REP N° ${data['id']}' : (data['numeroPapeleta'] ?? 'PAP N° ${data['id']}');
        final placaForCheck = (data['vehiculoPlaca']?.toString() ?? data['placa_visual']?.toString() ?? '');
        final isSinPlaca = placaForCheck.isEmpty || placaForCheck.startsWith('SIN-PLACA') || placaForCheck == 'SIN PLACA' || placaForCheck == 'Sin placa';
        final isSinConductor = (data['conductorNombre'] == null || data['conductorNombre'] == 'No identificado' || data['conductorDni'] == 'S/D');
        final isSinDueno = (data['propietarioNombre'] == null || data['propietarioNombre'] == 'No Registrado' || data['propietarioDni'] == 'S/D');
        final esSinIdentificar = isSinPlaca && isSinConductor && isSinDueno;
        
        final tipoTextoVehiculo = esSinIdentificar ? "Sin identificar" : (isFormal ? "Formal" : "Informal");

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
                if (!esReporte && (data['observacionesConductor'] != null && data['observacionesConductor'].toString().trim().isNotEmpty))
                  _buildFormattedObservaciones('Obs. Conductor:', data['observacionesConductor']),
                const Divider(height: 24),
                if (data['conductorNombre'] != null && data['conductorNombre'].toString().trim().isNotEmpty)
                  _buildDetailRow('Conductor:', '${data['conductorNombre']}\nN° Doc: ${data['conductorDni'] ?? 'S/D'}')
                else
                  _buildDetailRow('Conductor:', 'No identificado'),
                const SizedBox(height: 8),
                if (data['propietarioNombre'] != null && data['propietarioNombre'].toString().trim().isNotEmpty)
                  _buildDetailRow('Dueño:', '${data['propietarioNombre']}\nN° Doc: ${data['propietarioDni'] ?? 'S/D'}')
                else
                  _buildDetailRow('Dueño:', 'No identificado'),
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
                            return Padding(
                              padding: const EdgeInsets.only(right: 8.0),
                              child: Container(
                                decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300)),
                                child: fotoUrl.toString().startsWith('data:image')
                                    ? Image.memory(
                                        base64Decode(fotoUrl.toString().split(',').last),
                                        height: 100,
                                        width: 100,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) => const Text('Error al cargar'),
                                      )
                                    : Image.network(
                                        '${ApiService.fileBaseUrl}/$fotoUrl',
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

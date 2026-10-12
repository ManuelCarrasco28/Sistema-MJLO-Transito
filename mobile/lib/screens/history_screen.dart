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

  String _searchQuery = '';
  String _dateFilter = 'Todos'; // 'Todos', 'Hoy', 'Ayer', 'Última semana', 'Personalizado'
  DateTimeRange? _customDateRange;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

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
        // Si el reporte ya fue convertido a papeleta, no lo mostramos para evitar duplicados
        // ya que la papeleta correspondiente ya viene en la lista de papeletas.
        final estadoReporte = r['estado']?.toString().toUpperCase() ?? '';
        if (estadoReporte.contains('CONVERTIDO') || r['id_papeleta'] != null) {
          continue;
        }

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
            : Column(
                children: [
                  _buildFilterBar(),
                  Expanded(
                    child: TabBarView(
                      children: [
                        _buildListActividades(_getFilteredActividades()),
                        _buildListOperativos(_getFilteredOperativos()),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  List<dynamic> _getFilteredActividades() {
    DateTime now = DateTime.now();
    DateTime startOfToday = DateTime(now.year, now.month, now.day);

    return _todasActividades.where((item) {
      bool passDate = true;
      final dateStr = item['fecha_hora']?.toString() ?? item['fechaHora']?.toString() ?? '';
      DateTime? itemDate = DateTime.tryParse(dateStr);

      if (itemDate != null) {
        if (_dateFilter == 'Hoy') {
          passDate = itemDate.isAfter(startOfToday) || itemDate.isAtSameMomentAs(startOfToday);
        } else if (_dateFilter == 'Ayer') {
          DateTime startOfYesterday = startOfToday.subtract(const Duration(days: 1));
          passDate = (itemDate.isAfter(startOfYesterday) || itemDate.isAtSameMomentAs(startOfYesterday)) && itemDate.isBefore(startOfToday);
        } else if (_dateFilter == 'Última semana') {
          DateTime startOfWeek = startOfToday.subtract(const Duration(days: 7));
          passDate = itemDate.isAfter(startOfWeek) || itemDate.isAtSameMomentAs(startOfWeek);
        } else if (_dateFilter == 'Personalizado' && _customDateRange != null) {
          passDate = itemDate.isAfter(_customDateRange!.start) && itemDate.isBefore(_customDateRange!.end.add(const Duration(days: 1)));
        }
      }

      if (!passDate) return false;

      if (_searchQuery.isNotEmpty) {
        String query = _searchQuery.toLowerCase();
        String placa = (item['vehiculoPlaca']?.toString() ?? item['placa_visual']?.toString() ?? '').toLowerCase();
        String numDoc = (item['es_reporte'] == true ? 'REP N° ${item['id']}' : (item['numeroPapeleta'] ?? 'PAP N° ${item['id']}')).toString().toLowerCase();
        String opName = (item['operativoNombre']?.toString() ?? '').toLowerCase();

        if (!placa.contains(query) && !numDoc.contains(query) && !opName.contains(query)) {
          return false;
        }
      }

      return true;
    }).toList();
  }

  List<Map<String, dynamic>> _getFilteredOperativos() {
    if (_searchQuery.isEmpty) return _listaOperativos;
    String query = _searchQuery.toLowerCase();
    return _listaOperativos.where((op) {
      return (op['nombre']?.toString() ?? '').toLowerCase().contains(query);
    }).toList();
  }

  Widget _buildFilterBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Buscar placa, papeleta, reporte...',
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Colors.grey),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchQuery = '';
                              });
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.primaryBlue),
                    ),
                  ),
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                ),
              ),
              const SizedBox(width: 8),
              PopupMenuButton<String>(
                icon: Icon(
                  Icons.filter_list,
                  color: _dateFilter == 'Todos' ? Colors.grey.shade700 : AppTheme.primaryBlue,
                ),
                tooltip: 'Filtrar por fecha',
                onSelected: (String result) async {
                  if (result == 'Personalizado') {
                    final DateTimeRange? picked = await showDateRangePicker(
                      context: context,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now(),
                      builder: (context, child) {
                        return Theme(
                          data: Theme.of(context).copyWith(
                            colorScheme: const ColorScheme.light(
                              primary: AppTheme.primaryBlue,
                              onPrimary: Colors.white,
                              onSurface: Colors.black,
                            ),
                          ),
                          child: child!,
                        );
                      },
                    );
                    if (picked != null) {
                      setState(() {
                        _customDateRange = picked;
                        _dateFilter = result;
                      });
                    }
                  } else {
                    setState(() {
                      _dateFilter = result;
                      if (result != 'Personalizado') {
                        _customDateRange = null;
                      }
                    });
                  }
                },
                itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                  const PopupMenuItem<String>(
                    value: 'Todos',
                    child: Text('Todos los tiempos'),
                  ),
                  const PopupMenuItem<String>(
                    value: 'Hoy',
                    child: Text('Hoy'),
                  ),
                  const PopupMenuItem<String>(
                    value: 'Ayer',
                    child: Text('Ayer'),
                  ),
                  const PopupMenuItem<String>(
                    value: 'Última semana',
                    child: Text('Última semana'),
                  ),
                  const PopupMenuItem<String>(
                    value: 'Personalizado',
                    child: Text('Rango personalizado...'),
                  ),
                ],
              ),
            ],
          ),
          if (_dateFilter != 'Todos')
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryBlue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.calendar_today, size: 12, color: AppTheme.primaryBlue),
                        const SizedBox(width: 4),
                        Text(
                          _dateFilter == 'Personalizado' && _customDateRange != null
                              ? '${_customDateRange!.start.day}/${_customDateRange!.start.month} - ${_customDateRange!.end.day}/${_customDateRange!.end.month}'
                              : _dateFilter,
                          style: const TextStyle(fontSize: 12, color: AppTheme.primaryBlue, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _dateFilter = 'Todos';
                              _customDateRange = null;
                            });
                          },
                          child: const Icon(Icons.close, size: 14, color: AppTheme.primaryBlue),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildListOperativos(List<Map<String, dynamic>> list) {
    if (list.isEmpty) {
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
      itemCount: list.length,
      itemBuilder: (context, index) {
        final op = list[index];
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
          ? 'No hay papeletas ni reportes tuyos para esta consulta. Solo ves los que tú registraste; en la oficina se ve el historial completo.'
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
                if (!esReporte && (data['observacionesConductor'] != null && data['observacionesConductor'].toString().trim().isNotEmpty))
                  _buildFormattedObservaciones('Obs. Conductor:', data['observacionesConductor']),
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

import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'operative_history_screen.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _todasActividades = [];
  List<Map<String, dynamic>> _listaOperativos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final papeletas = await ApiService.getPapeletas();
      final reportes = await ApiService.getReportes();

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

      setState(() {
        _todasActividades = todas;
        _listaOperativos = opsMap.values.toList();
        _isLoading = false;
      });
    } catch (e) {
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
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_police, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No participaste en ningún operativo', style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
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
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.list_alt, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No hay actividades registradas', style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
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
        
        final isFormal = !esReporte && data['tipoInfractor'] == 'FORMAL';
        final esSinIdentificar = esReporte || (data['vehiculoPlaca'] != null && data['vehiculoPlaca'].toString().startsWith('SIN-PLACA'));
        
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
          tipoTexto = 'Formal (Infracción)';
        } else {
          cardColor = Colors.red;
          avatarBgColor = Colors.red.shade100;
          iconData = Icons.report_problem;
          tipoTexto = 'Informal (Infracción)';
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

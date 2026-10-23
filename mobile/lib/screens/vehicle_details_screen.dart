import 'package:flutter/material.dart';
import '../theme.dart';
import '../services/api_service.dart';
import 'issue_ticket_screen.dart';
import 'history_screen.dart';
import 'person_details_screen.dart';

class VehicleDetailsScreen extends StatefulWidget {
  final String searchQuery;
  final String searchType;
  final String? codeZona;
  final String? codeOficina;
  final String? sedeNombre;

  const VehicleDetailsScreen({
    super.key,
    required this.searchQuery,
    required this.searchType,
    this.codeZona,
    this.codeOficina,
    this.sedeNombre,
  });

  @override
  State<VehicleDetailsScreen> createState() => _VehicleDetailsScreenState();
}

class _VehicleDetailsScreenState extends State<VehicleDetailsScreen> with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  Map<String, dynamic>? _vehicleData;
  List<dynamic> _documents = [];
  String? _errorMessage;
  late AnimationController _animController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
    _fadeAnimation = CurvedAnimation(parent: _animController, curve: Curves.easeIn);
    _fetchVehicleDetails();
  }

  Future<void> _fetchVehicleDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final matched = await ApiService.buscarVehiculo(
        widget.searchType,
        widget.searchQuery,
        codeZona: widget.codeZona,
        codeOficina: widget.codeOficina,
      );

      if (matched == null) {
        setState(() {
          if (widget.searchType == 'PLACA') {
            final sede = widget.sedeNombre ?? 'la sede seleccionada';
            _errorMessage = 'No se encontró ningún vehículo con la placa ${widget.searchQuery} en $sede.\n\nVerifique si la placa está bien escrita o intente seleccionando otra sede de registro (SUNARP).';
          } else {
            _errorMessage = 'No se encontró información para:\n${widget.searchQuery}';
          }
          _isLoading = false;
        });
        return;
      }

      _vehicleData = matched;
      _documents = matched['documentosVehiculo'] ?? [];

      setState(() => _isLoading = false);
      _animController.forward();
    } catch (e) {
      setState(() {
        _errorMessage = 'Error al cargar los datos.\nPor favor intente nuevamente.';
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: const Text('Resultados', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppTheme.primaryBlue,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)))
          : _errorMessage != null
              ? _buildErrorState()
              : FadeTransition(
                  opacity: _fadeAnimation,
                  child: Stack(
                    children: [
                      _buildDetails(),
                      if (_vehicleData != null)
                        Positioned(
                          left: 0,
                          right: 0,
                          bottom: MediaQuery.of(context).padding.bottom + 16,
                          child: _buildActionButton(),
                        ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
          child: Container(
            padding: const EdgeInsets.all(24.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withOpacity(0.08),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppTheme.primaryBlue.withOpacity(0.15),
                      width: 2,
                    ),
                  ),
                  child: const Icon(
                    Icons.search_off_rounded,
                    size: 48,
                    color: AppTheme.primaryBlue,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  widget.searchType == 'PLACA'
                      ? 'Vehículo No Encontrado'
                      : 'Registro No Localizado',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.primaryBlue,
                  ),
                ),
                const SizedBox(height: 12),

                if (widget.searchType == 'PLACA') ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.black87, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'PERÚ',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 3,
                            color: Colors.blue.shade900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.searchQuery.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 3,
                            fontFamily: 'monospace',
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.account_balance_outlined,
                          size: 14,
                          color: AppTheme.primaryBlue,
                        ),
                        const SizedBox(width: 6),
                        Flexible(child: Text(
                          'Sede consultada: ${widget.sedeNombre ?? 'CHICLAYO'}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryBlue,
                          ),
                        )),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 16),

                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.lightbulb_outline, size: 16, color: Colors.amber.shade800),
                          const SizedBox(width: 6),
                          Text(
                            'Sugerencias de búsqueda:',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey.shade800,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _buildErrorTip(
                        Icons.edit_outlined,
                        'Verifique si la placa fue digitada correctamente sin errores tipográficos.',
                      ),
                      const SizedBox(height: 8),
                      _buildErrorTip(
                        Icons.swap_horiz_rounded,
                        'Si el vehículo fue matriculado en otra región, seleccione la sede SUNARP correspondiente.',
                      ),
                      const SizedBox(height: 8),
                      _buildErrorTip(
                        Icons.fact_check_outlined,
                        'Si la unidad no cuenta con placa o está ilegible, use la opción "Registrar sin identificar".',
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.pop(context, {
                      'reintentar': true,
                      'placa': widget.searchQuery,
                      'codeZona': widget.codeZona,
                      'codeOficina': widget.codeOficina,
                    }),
                    icon: const Icon(Icons.edit_note_rounded, size: 22),
                    label: const Text(
                      'VOLVER A BUSCAR / EDITAR PLACA',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryBlue,
                      foregroundColor: Colors.white,
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                TextButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back, size: 16),
                  label: const Text('Volver al panel principal'),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorTip(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 15, color: AppTheme.primaryBlue),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade700,
              height: 1.35,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton() {
    final allDocs = _obtenerListaDocumentos();
    final bool hasExpiredDocs = allDocs.any((doc) => doc['estado'] != 'VIGENTE');
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      width: double.infinity,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: double.infinity,
            height: 55,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => HistoryScreen(filterPlaca: _vehicleData!['placa']),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 5,
              ),
              icon: const Icon(Icons.history),
              label: const Text('Ver Historial de Actividades', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 55,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => IssueTicketScreen(vehicleData: _vehicleData!),
                  ),
                ).then((_) {
                  // Recargar datos del vehículo al volver (puede haber cambiado estado)
                  if (mounted) _fetchVehicleDetails();
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: hasExpiredDocs ? Colors.red.shade600 : Colors.orange.shade700,
                foregroundColor: Colors.white,
                elevation: 8,
                shadowColor: (hasExpiredDocs ? Colors.red : Colors.orange).withOpacity(0.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              icon: const Icon(Icons.assignment_late, size: 28),
              label: const Text('Continuar intervención', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.1)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetails() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 24.0, bottom: 200.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.primaryBlue, width: 3),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 5))
                ],
              ),
              child: Text(
                _vehicleData!['placa'] ?? 'SIN PLACA',
                style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Color(0xFF1E3A8A), letterSpacing: 2),
              ),
            ),
          ),
          
          const SizedBox(height: 32),
          _buildSectionTitle('DATOS TÉCNICOS', Icons.build),
          _buildInfoCard([
            _buildInfoRow('Tipo', _vehicleData!['tipo'] ?? '-'),
            _buildDivider(),
            _buildInfoRow('Marca', _vehicleData!['marca'] ?? '-'),
            _buildDivider(),
            _buildInfoRow('Modelo', _vehicleData!['modelo'] ?? '-'),
            _buildDivider(),
            _buildInfoRow('Color', _vehicleData!['color'] ?? '-'),
            _buildDivider(),
            _buildInfoRow('Categoría', _vehicleData!['categoria'] ?? '-'),
            _buildDivider(),
            _buildInfoRow('Carrocería', _vehicleData!['carroceria'] ?? '-'),
            _buildDivider(),
            _buildInfoRow('Año de Fabricación', _vehicleData!['anio']?.toString() ?? '-'),
          ]),

          const SizedBox(height: 24),
          _buildSectionTitle('DATOS TÉCNICOS & REGISTRO', Icons.account_balance),
          _buildInfoCard([
            _buildInfoRow('Nº Motor', _vehicleData!['serieMotor'] ?? '-'),
            _buildDivider(),
            _buildInfoRow('Nº Serie', _vehicleData!['numeroSerie'] ?? '-'),
            _buildDivider(),
            _buildInfoRow('Partida Registral', _vehicleData!['partidaRegistral'] ?? '-'),
            _buildDivider(),
            _buildInfoRow('Sede Registral', _vehicleData!['sedeRegistro'] ?? '-'),
          ]),

          const SizedBox(height: 24),
          _buildSectionTitle('TITULAR / PROPIETARIO', Icons.person),
          ...(_vehicleData!['propietario'] ?? 'Sin Propietario Asignado').toString().split(',').map((dueno) {
            final duenoLimpio = dueno.trim();
            if (duenoLimpio.isEmpty) return const SizedBox();
            return Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: GestureDetector(
                onTap: () {
                  if (_vehicleData!['propietarioDni'] != null && _vehicleData!['propietarioDni'].toString().isNotEmpty) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PersonDetailsScreen(dni: _vehicleData!['propietarioDni'].toString()),
                      ),
                    );
                  }
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.3)),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2))],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: AppTheme.primaryBlue.withOpacity(0.1), shape: BoxShape.circle),
                        child: const Icon(Icons.person, color: AppTheme.primaryBlue),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              duenoLimpio,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87),
                            ),
                            if (_vehicleData!['propietarioDni'] != null && _vehicleData!['propietarioDni'].toString().isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                'N° Doc: ${_vehicleData!['propietarioDni']}',
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                              ),
                            ]
                          ],
                        ),
                      ),
                      if (_vehicleData!['propietarioDni'] != null && _vehicleData!['propietarioDni'].toString().isNotEmpty)
                        const Icon(Icons.chevron_right, color: Colors.grey),
                    ],
                  ),
                ),
              ),
            );
          }),

          if (_vehicleData!['asociacion'] != null && _vehicleData!['asociacion'].toString().isNotEmpty) ...[
            const SizedBox(height: 24),
            _buildSectionTitle('ASOCIACIÓN / EMPRESA', Icons.business),
            _buildInfoCard([
              _buildInfoRow('Razón Social', _vehicleData!['asociacion'] ?? '-'),
              _buildDivider(),
              _buildInfoRow('Estado', (_vehicleData!['estado']?.toString().toUpperCase() == 'ACTIVO') ? 'FORMAL' : (_vehicleData!['estado'] ?? 'INFORMAL'), isHighlight: true),
            ]),
          ] else ...[
            const SizedBox(height: 24),
            _buildInfoCard([
              _buildInfoRow('Estado', 'INFORMAL', isHighlight: true),
            ]),
          ],

          const SizedBox(height: 32),
          _buildSectionTitle('Documentos del Vehículo', Icons.verified_user),
          Builder(
            builder: (context) {
              final rawId = _vehicleData!['id'];
              final isUnregistered = (rawId == null || rawId == 0 || rawId == '0');

              if (isUnregistered) {
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.red.shade400, size: 48),
                      const SizedBox(height: 12),
                      const Text(
                        'Vehículo no registrado en la municipalidad de JLO',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                );
              }

              final allDocs = _obtenerListaDocumentos();

              return ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: allDocs.length,
                itemBuilder: (context, index) => _buildDocumentCard(allDocs[index]),
              );
            }
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0, left: 4),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primaryBlue, size: 22),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF1E3A8A)),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(List<Widget> rows) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(children: rows),
      ),
    );
  }

  Widget _buildDivider() => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Divider(height: 1, color: Colors.grey.shade200),
  );

  Widget _buildInfoRow(String label, String value, {bool isHighlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontSize: 15,
              fontWeight: isHighlight ? FontWeight.bold : FontWeight.w600,
              color: isHighlight ? AppTheme.primaryBlue : Colors.black87,
            ),
          ),
        ),
      ],
    );
  }

  String _formatTipoDocumento(String? tipo) {
    if (tipo == null) return 'Documento';
    switch (tipo.toUpperCase().trim()) {
      case 'TARJETA_OPERATIVIDAD':
        return 'Tarjeta de Operatividad';
      case 'TARJETA_PROPIEDAD':
        return 'Tarjeta de Propiedad';
      case 'SOAT':
        return 'SOAT';
      case 'CERTICAV':
        return 'CERTICAV';
      default:
        return tipo.replaceAll('_', ' ').split(' ').map((w) {
          if (w.isEmpty) return '';
          return w[0].toUpperCase() + w.substring(1).toLowerCase();
        }).join(' ');
    }
  }

  List<Map<String, dynamic>> _obtenerListaDocumentos() {
    final expectedDocs = ['TARJETA_OPERATIVIDAD', 'TARJETA_PROPIEDAD', 'SOAT', 'CERTICAV'];
    final List<Map<String, dynamic>> allDocs = [];
    final hoy = DateTime.now().toIso8601String().substring(0, 10);

    for (final d in _documents) {
      if (d is Map) {
        final map = Map<String, dynamic>.from(d);
        final fExp = map['fechaExpiracion']?.toString().trim();
        if (fExp != null && fExp.isNotEmpty && fExp != '-') {
          map['estado'] = (fExp.compareTo(hoy) < 0) ? 'VENCIDO' : 'VIGENTE';
        }
        allDocs.add(map);
      }
    }

    if (_vehicleData?['certicav'] != null &&
        !allDocs.any((d) => (d['tipoDocumento'] ?? '').toString().toUpperCase() == 'CERTICAV')) {
      final c = _vehicleData!['certicav'];
      final fInicio = c['fecha']?.toString().trim();
      final fFin = (c['fechaVencimiento'] ?? c['fechaExpiracion'])?.toString().trim();

      String estado = c['estadoVigencia'] ?? '';
      if (estado.isEmpty || estado == 'APROBADO') {
        if (fFin != null && fFin.isNotEmpty && fFin != '-') {
          estado = (fFin.compareTo(hoy) < 0) ? 'VENCIDO' : 'VIGENTE';
        } else {
          estado = (c['resultado'] == 'APROBADO') ? 'VIGENTE' : (c['resultado'] ?? 'VIGENTE');
        }
      }

      allDocs.add({
        'tipoDocumento': 'CERTICAV',
        'codigo': c['numeroSerieCerticav'] ?? c['numeroRegistro'],
        'estado': estado,
        'fechaExpedicion': fInicio,
        'fechaExpiracion': fFin,
      });
    }

    for (var expected in expectedDocs) {
      if (!allDocs.any((d) => (d['tipoDocumento'] ?? '').toString().toUpperCase() == expected)) {
        allDocs.add({
          'tipoDocumento': expected,
          'estado': 'NO REGISTRADO',
        });
      }
    }

    return allDocs;
  }

  Widget _buildDocumentCard(Map<String, dynamic> doc) {
    final estadoRaw = (doc['estado'] ?? 'DESCONOCIDO').toString().toUpperCase().trim();
    final fechaExp = (doc['fechaExpiracion'] ?? '').toString().trim();
    final fechaExpedicion = (doc['fechaExpedicion'] ?? doc['fecha'] ?? '').toString().trim();
    final hoy = DateTime.now().toIso8601String().substring(0, 10);

    bool isMissing = estadoRaw == 'NO REGISTRADO' || estadoRaw == 'FALTANTE' || estadoRaw == 'SIN_REGISTRO';
    bool isExpired = false;

    if (!isMissing) {
      if (fechaExp.isNotEmpty && fechaExp != '-') {
        isExpired = fechaExp.compareTo(hoy) < 0;
      } else if (estadoRaw == 'VENCIDO' || estadoRaw == 'DESAPROBADO' || estadoRaw == 'ANULADA' || estadoRaw == 'ANULADO') {
        isExpired = true;
      }
    }

    String badgeText;
    Color statusColor;
    IconData statusIcon;

    if (isMissing) {
      badgeText = 'NO REGISTRADO';
      statusColor = const Color(0xFFEF4444);
      statusIcon = Icons.cancel;
    } else if (isExpired) {
      badgeText = 'VENCIDO';
      statusColor = const Color(0xFFDC2626);
      statusIcon = Icons.gpp_bad;
    } else {
      badgeText = 'VIGENTE';
      statusColor = const Color(0xFF16A34A);
      statusIcon = Icons.gpp_good;
    }

    final String? codigo = (doc['codigo'] != null && doc['codigo'].toString().trim().isNotEmpty)
        ? doc['codigo'].toString().trim()
        : null;

    final String fechaIniDisplay = (fechaExpedicion.isNotEmpty && fechaExpedicion != '-') ? fechaExpedicion : '';
    final String fechaFinDisplay = (fechaExp.isNotEmpty && fechaExp != '-') ? fechaExp : '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: (isExpired || isMissing) ? Colors.red.shade300 : Colors.green.shade300, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: (isExpired || isMissing ? Colors.red : Colors.green).withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                statusIcon,
                color: statusColor,
                size: 28,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _formatTipoDocumento(doc['tipoDocumento']),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15.5,
                      color: Colors.grey.shade800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (isMissing)
                    Text(
                      'Documento faltante en el padrón',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12.5),
                    )
                  else ...[
                    if (codigo != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 2),
                        child: Text(
                          'N°: $codigo',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 12.5, fontWeight: FontWeight.w600),
                        ),
                      ),
                    if (fechaIniDisplay.isNotEmpty && fechaFinDisplay.isNotEmpty)
                      Text(
                        'Desde: $fechaIniDisplay  •  ${isExpired ? 'Venció el' : 'Vence'}: $fechaFinDisplay',
                        style: TextStyle(
                          color: isExpired ? Colors.red.shade700 : Colors.grey.shade600,
                          fontSize: 12,
                          fontWeight: isExpired ? FontWeight.bold : FontWeight.w500,
                        ),
                      )
                    else if (fechaFinDisplay.isNotEmpty)
                      Text(
                        '${isExpired ? 'Venció el' : 'Vence'}: $fechaFinDisplay',
                        style: TextStyle(
                          color: isExpired ? Colors.red.shade700 : Colors.grey.shade600,
                          fontSize: 12,
                          fontWeight: isExpired ? FontWeight.bold : FontWeight.w500,
                        ),
                      )
                    else if (fechaIniDisplay.isNotEmpty)
                      Text(
                        'Desde: $fechaIniDisplay',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: statusColor,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                badgeText,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

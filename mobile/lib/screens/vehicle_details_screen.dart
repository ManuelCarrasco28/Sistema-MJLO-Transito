import 'package:flutter/material.dart';
import '../theme.dart';
import '../services/api_service.dart';
import 'issue_ticket_screen.dart';
import 'history_screen.dart';
import 'person_details_screen.dart';

class VehicleDetailsScreen extends StatefulWidget {
  final String searchQuery;
  final String searchType;

  const VehicleDetailsScreen({
    super.key,
    required this.searchQuery,
    required this.searchType,
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
      final matched = await ApiService.buscarVehiculo(widget.searchType, widget.searchQuery);

      if (matched == null) {
        setState(() {
          _errorMessage = 'No se encontró información para:\n${widget.searchQuery}';
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
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.red.shade50, shape: BoxShape.circle),
              child: Icon(Icons.search_off_rounded, size: 80, color: Colors.red.shade300),
            ),
            const SizedBox(height: 24),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, color: Colors.grey.shade800, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Volver a buscar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryBlue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
            )
          ],
        ),
      ),
      ),
    );
  }

  Widget _buildActionButton() {
    bool hasExpiredDocs = _documents.any((doc) => doc['estado'] != 'VIGENTE');
    
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
          GestureDetector(
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
                          _vehicleData!['propietario'] ?? 'Sin Propietario Asignado',
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
          _buildSectionTitle('Estado de Documentos', Icons.verified_user),
          if (_documents.isEmpty)
            Container(
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
                  Text('No tiene documentos registrados', style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _documents.length,
              itemBuilder: (context, index) => _buildDocumentCard(_documents[index]),
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

  Widget _buildDocumentCard(Map<String, dynamic> doc) {
    bool isExpired = doc['estado'] != 'VIGENTE';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isExpired ? Colors.red.shade300 : Colors.green.shade300, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: (isExpired ? Colors.red : Colors.green).withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (isExpired ? Colors.red : Colors.green).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isExpired ? Icons.gpp_bad : Icons.gpp_good,
                color: isExpired ? Colors.red : Colors.green,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    doc['tipoDocumento'] ?? 'Desconocido',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: Colors.grey.shade800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Vence: ${doc['fechaExpiracion'] ?? '-'}',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isExpired ? Colors.red : Colors.green,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                doc['estado'] ?? 'DESCONOCIDO',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

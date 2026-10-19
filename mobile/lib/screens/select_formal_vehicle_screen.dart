import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'technical_inspection_screen.dart';

class SelectFormalVehicleScreen extends StatefulWidget {
  const SelectFormalVehicleScreen({super.key});

  @override
  State<SelectFormalVehicleScreen> createState() => _SelectFormalVehicleScreenState();
}

class _SelectFormalVehicleScreenState extends State<SelectFormalVehicleScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  bool _isLoading = true;
  String _errorMessage = '';
  List<Map<String, dynamic>> _vehiculos = [];

  @override
  void initState() {
    super.initState();
    _cargarVehiculos();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _cargarVehiculos({String? query}) async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final data = await ApiService.getVehiculosFormales(
        buscar: query,
        porPagina: 50,
      );
      if (mounted) {
        setState(() {
          _vehiculos = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      _cargarVehiculos(query: query);
    });
  }

  Widget _buildPlacaBadge(String placa) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.black87, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
            decoration: BoxDecoration(
              color: const Color(0xFF0D47A1),
              borderRadius: BorderRadius.circular(2),
            ),
            child: const Text(
              'PE',
              style: TextStyle(
                color: Colors.white,
                fontSize: 8,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            placa.toUpperCase(),
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 15,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F9),
      appBar: AppBar(
        title: const Text(
          'Vehículos Formales',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: AppTheme.primaryBlue,
        elevation: 0,
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
          // Banner de aviso formal
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: const Color(0xFFE8F5E9),
            child: Row(
              children: [
                const Icon(Icons.verified, color: Color(0xFF2E7D32), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Solo vehículos formales asociados a empresas autorizadas pueden recibir inspección CERTICAV.',
                    style: TextStyle(
                      color: Colors.green.shade900,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Buscador
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'Buscar por placa, empresa o propietario...',
                hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: AppTheme.primaryBlue),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _cargarVehiculos();
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 2),
                ),
              ),
            ),
          ),

          // Lista de Vehículos Formales
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.primaryBlue),
                  )
                : _errorMessage.isNotEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.error_outline, size: 48, color: Colors.red),
                              const SizedBox(height: 12),
                              Text(
                                _errorMessage,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Colors.red),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: () => _cargarVehiculos(query: _searchController.text),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryBlue,
                                  foregroundColor: Colors.white,
                                ),
                                child: const Text('Reintentar'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _vehiculos.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.directions_car_outlined, size: 54, color: Colors.grey.shade400),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'No se encontraron vehículos formales',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      color: Color(0xFF333333),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Comprueba el texto ingresado o asegúrate que el vehículo esté vinculado a una asociación formal.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            padding: EdgeInsets.fromLTRB(16, 0, 16, 24 + MediaQuery.of(context).padding.bottom),
                            itemCount: _vehiculos.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final v = _vehiculos[index];
                              final placa = v['placa']?.toString() ?? 'SIN PLACA';
                              final asociacion = v['asociacion']?.toString() ?? 'ASOCIACIÓN FORMAL';
                              final propietario = v['propietario']?.toString() ?? 'Sin propietario';
                              final propietarioDni = v['propietarioDni']?.toString() ?? '';
                              final marca = v['marca']?.toString() ?? '';
                              final modelo = v['modelo']?.toString() ?? '';
                              final anio = v['anio']?.toString() ?? '';
                              final color = v['color']?.toString() ?? '';

                              return InkWell(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => TechnicalInspectionScreen(vehiculo: v),
                                    ),
                                  );
                                },
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.grey.shade200),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.03),
                                        blurRadius: 8,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        crossAxisAlignment: CrossAxisAlignment.center,
                                        children: [
                                          _buildPlacaBadge(placa),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFE8F5E9),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(color: const Color(0xFFA5D6A7)),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.check_circle, size: 12, color: Color(0xFF2E7D32)),
                                                SizedBox(width: 4),
                                                Text(
                                                  'FORMAL',
                                                  style: TextStyle(
                                                    color: Color(0xFF1B5E20),
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w900,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),

                                      // Asociación formal
                                      Row(
                                        children: [
                                          const Icon(Icons.business, size: 16, color: AppTheme.primaryBlue),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              asociacion,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                                color: AppTheme.primaryBlue,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),

                                      // Propietario
                                      Row(
                                        children: [
                                          Icon(Icons.person_outline, size: 16, color: Colors.grey.shade600),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              '$propietario ${propietarioDni.isNotEmpty ? "($propietarioDni)" : ""}',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey.shade800,
                                                fontWeight: FontWeight.w500,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),

                                      // Marca / Modelo / Año
                                      Row(
                                        children: [
                                          Icon(Icons.two_wheeler, size: 16, color: Colors.grey.shade500),
                                          const SizedBox(width: 6),
                                          Text(
                                            [marca, modelo, anio, color].where((s) => s.isNotEmpty).join(' · '),
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: Colors.grey.shade600,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),

                                      // Botón acción
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.symmetric(vertical: 9),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primaryBlue.withOpacity(0.06),
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.12)),
                                        ),
                                        child: const Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              'Iniciar Inspección Técnica',
                                              style: TextStyle(
                                                color: AppTheme.primaryBlue,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                            ),
                                            SizedBox(width: 4),
                                            Icon(Icons.arrow_forward, size: 14, color: AppTheme.primaryBlue),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    ),
  );
  }
}

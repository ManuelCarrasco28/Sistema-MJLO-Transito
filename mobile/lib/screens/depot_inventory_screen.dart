import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme.dart';

class DepotInventoryScreen extends StatefulWidget {
  final Map<String, dynamic> internamiento;

  const DepotInventoryScreen({
    super.key,
    required this.internamiento,
  });

  @override
  State<DepotInventoryScreen> createState() => _DepotInventoryScreenState();
}

class _DepotInventoryScreenState extends State<DepotInventoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isSearchingInteresado = false;

  List<Map<String, dynamic>> _criterios = [];
  final Map<int, int> _cantidades = {};

  final TextEditingController _dniInteresadoCtrl = TextEditingController();
  final TextEditingController _nombreInteresadoCtrl = TextEditingController();
  final TextEditingController _observacionesCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _initData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _dniInteresadoCtrl.dispose();
    _nombreInteresadoCtrl.dispose();
    _observacionesCtrl.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    setState(() => _isLoading = true);

    final item = widget.internamiento;
    final dni = (item['interesadoDni'] ?? '').toString();
    _dniInteresadoCtrl.text = (dni.isNotEmpty && dni != 'S/D') ? dni : '';
    _nombreInteresadoCtrl.text = (item['interesadoNombre'] ?? '').toString();
    _observacionesCtrl.text = (item['observaciones'] ?? '').toString();

    // Cargar inventario existente
    if (item['inventario'] is List) {
      for (final inv in item['inventario']) {
        final cid = int.tryParse(inv['criterioId']?.toString() ?? '');
        final cant = int.tryParse(inv['cantidad']?.toString() ?? '');
        if (cid != null && cant != null) {
          _cantidades[cid] = cant;
        }
      }
    }

    try {
      final list = await ApiService.getInventarioCriterios();
      if (mounted) {
        setState(() {
          _criterios = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _buscarInteresado() async {
    final dni = _dniInteresadoCtrl.text.trim();
    if (dni.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingrese un DNI válido de 8 dígitos')),
      );
      return;
    }

    setState(() => _isSearchingInteresado = true);
    try {
      final persona = await ApiService.getPersonaByDni(dni);
      if (persona != null) {
        final nom = '${persona['nombres'] ?? ''} ${persona['apellidoPaterno'] ?? ''} ${persona['apellidoMaterno'] ?? ''}'.trim();
        setState(() {
          _nombreInteresadoCtrl.text = nom.isNotEmpty ? nom : 'Registrado en sistema';
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Interesado encontrado'), backgroundColor: Colors.green),
          );
        }
      } else {
        setState(() {
          _nombreInteresadoCtrl.text = 'No registrado';
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Persona no encontrada en el padrón')),
          );
        }
      }
    } catch (_) {
      // Ignorar error
    } finally {
      if (mounted) setState(() => _isSearchingInteresado = false);
    }
  }

  List<Map<String, dynamic>> _getCriteriosPorSeccion(String seccion) {
    return _criterios.where((c) {
      final s = (c['seccion'] ?? '').toString().toUpperCase();
      return s.contains(seccion.toUpperCase());
    }).toList();
  }

  void _marcarTodos(String seccion, int valor) {
    final items = _getCriteriosPorSeccion(seccion);
    setState(() {
      for (final it in items) {
        final id = int.tryParse(it['id']?.toString() ?? '');
        if (id != null) {
          _cantidades[id] = valor;
        }
      }
    });
  }

  Future<void> _guardarCambios() async {
    setState(() => _isSaving = true);

    try {
      final inventarioPayload = _cantidades.entries
          .where((e) => e.value >= 0)
          .map((e) => {'idCriterio': e.key, 'cantidad': e.value})
          .toList();

      final data = {
        'interesadoDni': _dniInteresadoCtrl.text.trim(),
        'observaciones': _observacionesCtrl.text.trim(),
        'inventario': inventarioPayload,
      };

      final id = widget.internamiento['uuid'] ?? widget.internamiento['id'];
      await ApiService.actualizarInternamiento(id, data);

      if (mounted) {
        final bool eraEnProceso = (widget.internamiento['estado'] ?? '').toString().toUpperCase() == 'EN_PROCESO';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(eraEnProceso
                ? 'Inventario completado. El vehículo ahora está RETENIDO en el depósito.'
                : 'Inventario actualizado con éxito'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildItemRow(Map<String, dynamic> c) {
    final id = int.tryParse(c['id']?.toString() ?? '') ?? 0;
    final nombre = (c['nombre'] ?? '').toString().toUpperCase();
    final cant = _cantidades[id] ?? 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cant > 0 ? AppTheme.primaryBlue.withOpacity(0.4) : Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              nombre,
              style: TextStyle(
                fontWeight: cant > 0 ? FontWeight.bold : FontWeight.w500,
                fontSize: 13,
                color: cant > 0 ? Colors.black87 : Colors.grey.shade700,
              ),
            ),
          ),
          InkWell(
            onTap: () {
              setState(() {
                if (cant > 0) {
                  _cantidades[id] = 0;
                } else {
                  _cantidades[id] = 1;
                }
              });
            },
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.all(6),
              child: Icon(
                cant > 0 ? Icons.check_circle : Icons.radio_button_unchecked,
                color: cant > 0 ? Colors.green : Colors.grey.shade400,
                size: 24,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                InkWell(
                  onTap: () {
                    if (cant > 0) {
                      setState(() => _cantidades[id] = cant - 1);
                    }
                  },
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Icon(Icons.remove, size: 16, color: Colors.black54),
                  ),
                ),
                Text(
                  '$cant',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                InkWell(
                  onTap: () {
                    setState(() => _cantidades[id] = cant + 1);
                  },
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Icon(Icons.add, size: 16, color: Colors.black54),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabContent(String seccion) {
    final items = _getCriteriosPorSeccion(seccion);
    if (items.isEmpty) {
      return Center(
        child: Text(
          'Sin criterios registrados para $seccion',
          style: TextStyle(color: Colors.grey.shade600),
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${items.length} ELEMENTOS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade600, letterSpacing: 0.5),
              ),
              Row(
                children: [
                  TextButton.icon(
                    onPressed: () => _marcarTodos(seccion, 1),
                    icon: const Icon(Icons.done_all, size: 16),
                    label: const Text('Marcar 1', style: TextStyle(fontSize: 12)),
                    style: TextButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      foregroundColor: AppTheme.primaryBlue,
                    ),
                  ),
                  const SizedBox(width: 4),
                  TextButton.icon(
                    onPressed: () => _marcarTodos(seccion, 0),
                    icon: const Icon(Icons.clear_all, size: 16),
                    label: const Text('Limpiar', style: TextStyle(fontSize: 12)),
                    style: TextButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      foregroundColor: Colors.red.shade400,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            physics: const BouncingScrollPhysics(),
            itemCount: items.length,
            itemBuilder: (context, idx) => _buildItemRow(items[idx]),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.internamiento;
    final boleta = (item['numeroBoleta'] ?? '').toString();
    final placa = (item['vehiculoPlaca'] ?? '').toString();
    final papeleta = (item['numeroPapeleta'] ?? '').toString();

    final bool esEnProceso = (item['estado'] ?? '').toString().toUpperCase() == 'EN_PROCESO';

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              esEnProceso ? 'Inventario de Ingreso $boleta' : 'Inventario $boleta',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            if (placa.isNotEmpty)
              Text(
                'Placa: $placa ${papeleta.isNotEmpty ? "• Papeleta: $papeleta" : ""}',
                style: const TextStyle(fontSize: 12, color: Colors.white70),
              ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: '1. EXTERIOR'),
            Tab(text: '2. INTERIOR'),
            Tab(text: '3. MOTOR'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Sección superior: Datos rápidos e interesado
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Column(
                    children: [
                      if (esEnProceso)
                        Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0F2FE),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF38BDF8)),
                          ),
                          child: Row(
                            children: const [
                              Icon(Icons.local_shipping_outlined, size: 18, color: Color(0xFF0284C7)),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Vehículo en camino al depósito. Al guardar el inventario, pasará formalmente a estado RETENIDO.',
                                  style: TextStyle(fontSize: 11.5, color: Color(0xFF0369A1), fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _dniInteresadoCtrl,
                              keyboardType: TextInputType.number,
                              maxLength: 8,
                              decoration: InputDecoration(
                                counterText: '',
                                labelText: 'DNI Interesado',
                                hintText: 'Ingrese DNI',
                                isDense: true,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _isSearchingInteresado ? null : _buscarInteresado,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryBlue,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: _isSearchingInteresado
                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.search, size: 20),
                          ),
                        ],
                      ),
                      if (_nombreInteresadoCtrl.text.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Row(
                            children: [
                              const Icon(Icons.person, size: 16, color: Colors.grey),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  _nombreInteresadoCtrl.text,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black87),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),

                // Pestañas de inventario
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildTabContent('PARTE EXTERIOR'),
                      _buildTabContent('PARTE INTERIOR'),
                      _buildTabContent('MOTOR'),
                    ],
                  ),
                ),

                // Observaciones
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: TextField(
                    controller: _observacionesCtrl,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: 'Observaciones del estado del vehículo',
                      hintText: 'Detalles de abolladuras, rayaduras, accesorios faltantes...',
                      isDense: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),

                // Barra inferior de botones responsiva
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 8,
                        offset: const Offset(0, -3),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              flex: 2,
                              child: OutlinedButton(
                                onPressed: _isSaving ? null : () => Navigator.pop(context),
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(0, 48),
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  side: BorderSide(color: Colors.grey.shade300),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: const FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text('Cancelar', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 3,
                              child: ElevatedButton(
                                onPressed: _isSaving ? null : _guardarCambios,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryBlue,
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(0, 48),
                                  padding: const EdgeInsets.symmetric(horizontal: 10),
                                  elevation: 2,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: _isSaving
                                    ? const SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.2),
                                      )
                                    : Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(esEnProceso ? Icons.check_circle_outline : Icons.save_outlined, size: 18),
                                          const SizedBox(width: 6),
                                          Flexible(
                                            child: FittedBox(
                                              fit: BoxFit.scaleDown,
                                              child: Text(
                                                esEnProceso ? 'Completar Ingreso' : 'Guardar Cambios',
                                                textAlign: TextAlign.center,
                                                maxLines: 1,
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

import 'package:flutter/material.dart';

class OficinaRegistral {
  final String codeZona;
  final String codeOficina;
  final String descripcion;

  const OficinaRegistral({
    required this.codeZona,
    required this.codeOficina,
    required this.descripcion,
  });

  String get clave => '${codeZona}_$codeOficina';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OficinaRegistral &&
          runtimeType == other.runtimeType &&
          codeZona == other.codeZona &&
          codeOficina == other.codeOficina;

  @override
  int get hashCode => codeZona.hashCode ^ codeOficina.hashCode;
}

const OficinaRegistral kOficinaChiclayo = OficinaRegistral(
  codeZona: '11',
  codeOficina: '01',
  descripcion: 'CHICLAYO',
);

const List<OficinaRegistral> kOficinasRegistrales = [
  OficinaRegistral(codeZona: '11', codeOficina: '01', descripcion: 'CHICLAYO'),
  OficinaRegistral(codeZona: '01', codeOficina: '01', descripcion: 'LIMA'),
  OficinaRegistral(codeZona: '01', codeOficina: '02', descripcion: 'CALLAO'),
  OficinaRegistral(codeZona: '01', codeOficina: '03', descripcion: 'HUARAL'),
  OficinaRegistral(codeZona: '01', codeOficina: '04', descripcion: 'HUACHO'),
  OficinaRegistral(codeZona: '01', codeOficina: '05', descripcion: 'CAÑETE'),
  OficinaRegistral(codeZona: '01', codeOficina: '06', descripcion: 'BARRANCA'),
  OficinaRegistral(codeZona: '02', codeOficina: '01', descripcion: 'HUANCAYO'),
  OficinaRegistral(codeZona: '02', codeOficina: '02', descripcion: 'HUANUCO'),
  OficinaRegistral(codeZona: '02', codeOficina: '04', descripcion: 'PASCO'),
  OficinaRegistral(codeZona: '02', codeOficina: '05', descripcion: 'SATIPO'),
  OficinaRegistral(codeZona: '02', codeOficina: '06', descripcion: 'LA MERCED (SELVA CENTRAL)'),
  OficinaRegistral(codeZona: '02', codeOficina: '07', descripcion: 'TARMA'),
  OficinaRegistral(codeZona: '02', codeOficina: '08', descripcion: 'TINGO MARIA'),
  OficinaRegistral(codeZona: '02', codeOficina: '09', descripcion: 'HUANCAVELICA'),
  OficinaRegistral(codeZona: '03', codeOficina: '01', descripcion: 'AREQUIPA'),
  OficinaRegistral(codeZona: '03', codeOficina: '02', descripcion: 'CAMANA'),
  OficinaRegistral(codeZona: '03', codeOficina: '03', descripcion: 'CASTILLA - APLAO'),
  OficinaRegistral(codeZona: '03', codeOficina: '04', descripcion: 'ISLAY - MOLLENDO'),
  OficinaRegistral(codeZona: '04', codeOficina: '01', descripcion: 'HUARAZ'),
  OficinaRegistral(codeZona: '04', codeOficina: '02', descripcion: 'CASMA'),
  OficinaRegistral(codeZona: '04', codeOficina: '03', descripcion: 'CHIMBOTE'),
  OficinaRegistral(codeZona: '05', codeOficina: '01', descripcion: 'PIURA'),
  OficinaRegistral(codeZona: '05', codeOficina: '02', descripcion: 'SULLANA'),
  OficinaRegistral(codeZona: '05', codeOficina: '03', descripcion: 'TUMBES'),
  OficinaRegistral(codeZona: '06', codeOficina: '01', descripcion: 'CUSCO'),
  OficinaRegistral(codeZona: '06', codeOficina: '02', descripcion: 'ABANCAY'),
  OficinaRegistral(codeZona: '06', codeOficina: '03', descripcion: 'MADRE DE DIOS'),
  OficinaRegistral(codeZona: '06', codeOficina: '04', descripcion: 'QUILLABAMBA'),
  OficinaRegistral(codeZona: '06', codeOficina: '05', descripcion: 'SICUANI'),
  OficinaRegistral(codeZona: '06', codeOficina: '06', descripcion: 'ESPINAR'),
  OficinaRegistral(codeZona: '06', codeOficina: '07', descripcion: 'ANDAHUAYLAS'),
  OficinaRegistral(codeZona: '07', codeOficina: '01', descripcion: 'TACNA'),
  OficinaRegistral(codeZona: '07', codeOficina: '02', descripcion: 'ILO'),
  OficinaRegistral(codeZona: '07', codeOficina: '03', descripcion: 'JULIACA'),
  OficinaRegistral(codeZona: '07', codeOficina: '04', descripcion: 'MOQUEGUA'),
  OficinaRegistral(codeZona: '07', codeOficina: '05', descripcion: 'PUNO'),
  OficinaRegistral(codeZona: '08', codeOficina: '01', descripcion: 'TRUJILLO'),
  OficinaRegistral(codeZona: '08', codeOficina: '02', descripcion: 'CHEPEN'),
  OficinaRegistral(codeZona: '08', codeOficina: '03', descripcion: 'HUAMACHUCO'),
  OficinaRegistral(codeZona: '08', codeOficina: '04', descripcion: 'OTUZCO'),
  OficinaRegistral(codeZona: '08', codeOficina: '05', descripcion: 'SAN PEDRO'),
  OficinaRegistral(codeZona: '09', codeOficina: '01', descripcion: 'MAYNAS'),
  OficinaRegistral(codeZona: '10', codeOficina: '01', descripcion: 'ICA'),
  OficinaRegistral(codeZona: '10', codeOficina: '02', descripcion: 'CHINCHA'),
  OficinaRegistral(codeZona: '10', codeOficina: '03', descripcion: 'PISCO'),
  OficinaRegistral(codeZona: '10', codeOficina: '04', descripcion: 'NAZCA'),
  OficinaRegistral(codeZona: '11', codeOficina: '02', descripcion: 'CAJAMARCA'),
  OficinaRegistral(codeZona: '11', codeOficina: '03', descripcion: 'JAEN'),
  OficinaRegistral(codeZona: '11', codeOficina: '04', descripcion: 'BAGUA'),
  OficinaRegistral(codeZona: '11', codeOficina: '05', descripcion: 'CHACHAPOYAS'),
  OficinaRegistral(codeZona: '11', codeOficina: '06', descripcion: 'CHOTA'),
  OficinaRegistral(codeZona: '12', codeOficina: '01', descripcion: 'MOYOBAMBA'),
  OficinaRegistral(codeZona: '12', codeOficina: '02', descripcion: 'TARAPOTO'),
  OficinaRegistral(codeZona: '12', codeOficina: '03', descripcion: 'JUANJUI'),
  OficinaRegistral(codeZona: '12', codeOficina: '04', descripcion: 'YURIMAGUAS'),
  OficinaRegistral(codeZona: '13', codeOficina: '01', descripcion: 'PUCALLPA'),
  OficinaRegistral(codeZona: '14', codeOficina: '01', descripcion: 'AYACUCHO'),
  OficinaRegistral(codeZona: '14', codeOficina: '02', descripcion: 'HUANTA'),
];

class SedeRegistralField extends StatelessWidget {
  final OficinaRegistral selected;
  final ValueChanged<OficinaRegistral> onChanged;
  final String label;

  const SedeRegistralField({
    super.key,
    required this.selected,
    required this.onChanged,
    this.label = 'Sede de registro',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 6),
        InkWell(
          onTap: () async {
            final picked = await showModalBottomSheet<OficinaRegistral>(
              context: context,
              isScrollControlled: true,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              builder: (ctx) => _SelectorModal(actual: selected),
            );
            if (picked != null) {
              onChanged(picked);
            }
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              children: [
                const Icon(Icons.account_balance_outlined, size: 18, color: Color(0xFF1E3A8A)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    selected.descripcion,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                ),
                Icon(Icons.keyboard_arrow_down, color: Colors.grey.shade600),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SelectorModal extends StatefulWidget {
  final OficinaRegistral actual;
  const _SelectorModal({required this.actual});

  @override
  State<_SelectorModal> createState() => _SelectorModalState();
}

class _SelectorModalState extends State<_SelectorModal> {
  final _searchCtrl = TextEditingController();
  String _filtro = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtradas = kOficinasRegistrales.where((o) {
      if (_filtro.isEmpty) return true;
      return o.descripcion.toLowerCase().contains(_filtro.toLowerCase());
    }).toList();

    return SafeArea(
      child: Container(
        height: MediaQuery.of(context).size.height * 0.7,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          children: [
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Seleccionar sede de registro',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E3A8A),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Lugar donde está registrado el vehículo (SUNARP)',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _filtro = v.trim()),
              decoration: InputDecoration(
                hintText: 'Buscar ciudad o sede...',
                prefixIcon: const Icon(Icons.search, size: 20),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                filled: true,
                fillColor: Colors.grey.shade50,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.separated(
                itemCount: filtradas.length,
                separatorBuilder: (ctx, idx) => Divider(height: 1, color: Colors.grey.shade200),
                itemBuilder: (ctx, index) {
                  final ofi = filtradas[index];
                  final esSel = ofi == widget.actual;
                  return ListTile(
                    dense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                    title: Text(
                      ofi.descripcion,
                      style: TextStyle(
                        fontWeight: esSel ? FontWeight.bold : FontWeight.normal,
                        color: esSel ? const Color(0xFF1E3A8A) : Colors.black87,
                      ),
                    ),
                    trailing: esSel
                        ? const Icon(Icons.check_circle, color: Color(0xFF1E3A8A), size: 20)
                        : null,
                    onTap: () => Navigator.pop(context, ofi),
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

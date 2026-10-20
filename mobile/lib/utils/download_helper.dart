import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class DownloadHelper {
  static const MethodChannel _channel = MethodChannel('com.angelus.app_transito/download');

  static Future<void> abrirPdfNativo(String uriString) async {
    try {
      if (Platform.isAndroid) {
        await _channel.invokeMethod('openPdf', {'uri': uriString});
      }
    } catch (e) {
      debugPrint('Error al abrir PDF nativo: $e');
    }
  }

  static Future<String?> guardarArchivo(Uint8List bytes, String nombreArchivo) async {
    if (Platform.isAndroid) {
      try {
        final String? uriString = await _channel.invokeMethod<String>('saveToDownloads', {
          'bytes': bytes,
          'fileName': nombreArchivo,
        });
        if (uriString != null) {
          return uriString;
        }
      } catch (e) {
        debugPrint('Error en canal nativo MediaStore: $e');
      }
    }

    try {
      Directory? dir = await getDownloadsDirectory();
      dir ??= await getApplicationDocumentsDirectory();

      final file = File('${dir.path}/$nombreArchivo');
      await file.writeAsBytes(bytes, flush: true);
      return file.path;
    } catch (_) {
      try {
        final appDir = await getApplicationDocumentsDirectory();
        final file = File('${appDir.path}/$nombreArchivo');
        await file.writeAsBytes(bytes, flush: true);
        return file.path;
      } catch (_) {
        return null;
      }
    }
  }

  static Future<bool> descargarYGuardar(
    BuildContext context, {
    required String url,
    required String nombreArchivo,
    Uint8List? bytesExistentes,
  }) async {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 12),
            Text('Descargando documento PDF...'),
          ],
        ),
        duration: Duration(seconds: 2),
      ),
    );

    try {
      Uint8List bytes;
      if (bytesExistentes != null && bytesExistentes.isNotEmpty) {
        bytes = bytesExistentes;
      } else {
        final res = await http.get(Uri.parse(url));
        if (res.statusCode != 200 || res.bodyBytes.isEmpty) {
          throw Exception('No se pudo descargar el archivo (HTTP ${res.statusCode})');
        }
        bytes = res.bodyBytes;
      }

      final rutaGuardada = await guardarArchivo(bytes, nombreArchivo);

      if (rutaGuardada != null && context.mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Descargado en carpeta Descargas',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Text(
                        nombreArchivo,
                        style: const TextStyle(fontSize: 11, color: Colors.white70),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            action: SnackBarAction(
              label: 'ABRIR',
              textColor: const Color(0xFFFFD54F),
              onPressed: () => abrirPdfNativo(rutaGuardada),
            ),
            backgroundColor: const Color(0xFF1B5E20),
            duration: const Duration(seconds: 5),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        return true;
      } else {
        throw Exception('No se pudo guardar el archivo en el dispositivo.');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al descargar: $e'),
            backgroundColor: const Color(0xFFC62828),
            duration: const Duration(seconds: 4),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
      return false;
    }
  }
}

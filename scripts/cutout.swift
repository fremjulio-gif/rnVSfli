import Foundation
import Vision
import CoreImage
import AppKit

guard CommandLine.arguments.count >= 4 else {
    fputs("Usage: swift cutout.swift <input> <output.png> <maxWidth>\n", stderr)
    exit(1)
}

let inputPath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let maxWidth = CGFloat(Double(CommandLine.arguments[3]) ?? 480.0)

let inputUrl = URL(fileURLWithPath: inputPath)
guard let ciInput = CIImage(contentsOf: inputUrl) else {
    fputs("Impossible de charger l'image: \(inputPath)\n", stderr)
    exit(2)
}

// Normalise l'orientation EXIF
let oriented = ciInput.oriented(forExifOrientation: Int32(ciInput.properties[kCGImagePropertyOrientation as String] as? UInt32 ?? 1))

let handler = VNImageRequestHandler(ciImage: oriented, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()

do {
    try handler.perform([request])
} catch {
    fputs("Erreur Vision: \(error)\n", stderr)
    exit(3)
}

guard let observation = request.results?.first else {
    fputs("Aucun sujet détecté dans: \(inputPath)\n", stderr)
    exit(4)
}

let maskPixelBuffer: CVPixelBuffer
do {
    maskPixelBuffer = try observation.generateScaledMaskForImage(forInstances: observation.allInstances, from: handler)
} catch {
    fputs("Erreur génération masque: \(error)\n", stderr)
    exit(5)
}

let maskImage = CIImage(cvPixelBuffer: maskPixelBuffer)
let clearBackground = CIImage(color: .clear).cropped(to: oriented.extent)

guard let blendFilter = CIFilter(name: "CIBlendWithMask") else {
    fputs("CIBlendWithMask indisponible\n", stderr)
    exit(6)
}
blendFilter.setValue(oriented, forKey: kCIInputImageKey)
blendFilter.setValue(clearBackground, forKey: kCIInputBackgroundImageKey)
blendFilter.setValue(maskImage, forKey: kCIInputMaskImageKey)

guard let masked = blendFilter.outputImage else {
    fputs("Échec du détourage\n", stderr)
    exit(7)
}

// Recadrage sur la boîte englobante non-transparente (haut du buste/tête si portrait très long)
let extent = masked.extent
let targetWidth = min(maxWidth, extent.width)
let scale = targetWidth / extent.width
let scaled = masked.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
let scaledExtent = scaled.extent

// Limite la hauteur max à 1.28 * largeur pour garder un cadrage buste/visage homogène dans l'arène
let maxH = min(scaledExtent.height, targetWidth * 1.28)
let cropRect = CGRect(
    x: scaledExtent.origin.x,
    y: scaledExtent.origin.y + (scaledExtent.height - maxH),
    width: scaledExtent.width,
    height: maxH
)
let cropped = scaled.cropped(to: cropRect)

let context = CIContext()
guard let cgImage = context.createCGImage(cropped, from: cropped.extent) else {
    fputs("Échec création CGImage\n", stderr)
    exit(8)
}

let bitmap = NSBitmapImageRep(cgImage: cgImage)
guard let pngData = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Échec encodage PNG\n", stderr)
    exit(9)
}

try pngData.write(to: URL(fileURLWithPath: outputPath))
print("OK \(outputPath) (\(Int(cropped.extent.width))x\(Int(cropped.extent.height)), \(pngData.count) bytes)")

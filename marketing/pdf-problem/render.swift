import PDFKit
import AppKit
let args = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: args[1]))!
print("pages:", doc.pageCount)
let page = doc.page(at: Int(args[2])!)!
let b = page.bounds(for: .mediaBox)
let scale: CGFloat = 3
let w = Int(b.width*scale), h = Int(b.height*scale)
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
let ctx = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = ctx
let cg = ctx.cgContext
cg.setFillColor(NSColor.white.cgColor); cg.fill(CGRect(x:0,y:0,width:w,height:h))
cg.scaleBy(x: scale, y: scale)
page.draw(with: .mediaBox, to: cg)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[3]))

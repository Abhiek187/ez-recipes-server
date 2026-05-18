import jsPDF from "jspdf";

/**
 * Wrapper around jsPDF to help with arranging content & paginating
 */
export default class PDFCreate {
  // A4, portrait, and mm by default
  private readonly MARGIN = 12.7;
  private readonly DEFAULT_FONT = "helvetica";
  private readonly DEFAULT_FONT_SIZE = 16;

  // Public in case jsPDF methods should be called directly
  doc = new jsPDF();
  private readonly pageWidth = this.doc.internal.pageSize.width;
  private readonly pageHeight = this.doc.internal.pageSize.height;
  private readonly maxLineWidth = this.pageWidth - this.MARGIN * 2;
  private docY = this.MARGIN;

  private paginate(lines = 1) {
    // Need to paginate manually :(
    this.docY += 10 * lines;

    if (this.docY >= this.pageHeight - this.MARGIN) {
      this.doc.addPage();
      this.docY = this.MARGIN;
    }
  }

  text(
    text: string,
    {
      bold = false,
      size,
      align = "left",
      circle = false,
    }: {
      bold?: boolean;
      size?: number;
      align?: "left" | "center" | "right" | "justify";
      circle?: boolean;
    } = {}
  ) {
    // Split long text across multiple lines
    const textLines = this.doc.splitTextToSize(text, this.maxLineWidth);
    // Check if there's enough room for all the text
    if (this.docY + 10 * textLines.length >= this.pageHeight - this.MARGIN) {
      this.doc.addPage();
      this.docY = this.MARGIN;
    }

    if (bold) this.doc.setFont(this.DEFAULT_FONT, "bold");
    if (size) this.doc.setFontSize(size);
    const docX =
      align === "left"
        ? this.MARGIN
        : align === "center"
          ? this.pageWidth / 2
          : this.pageWidth - this.MARGIN;
    this.doc.text(textLines, docX, this.docY, {
      align,
    });
    if (circle) {
      const textSize = this.doc.getTextDimensions(text);
      this.doc.ellipse(
        docX + textSize.w / 2,
        this.docY - textSize.h / 3,
        textSize.w,
        textSize.h
      );
    }

    if (bold) this.doc.setFont(this.DEFAULT_FONT, "normal");
    if (size) this.doc.setFontSize(this.DEFAULT_FONT_SIZE);
    this.paginate(textLines.length);
  }

  async addImage(url: string, width: number, height: number) {
    try {
      // jsPDF reads local files by default, but we need to fetch the image remotely
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = response.headers.get("content-type") || "image/jpeg";
      const base64Image = `data:${mimeType};base64,${base64}`;

      this.doc.addImage(
        base64Image,
        "JPEG",
        (this.pageWidth - width) / 2,
        this.docY,
        width,
        height
      );
      this.paginate(height / 10 + 1);
    } catch (error) {
      console.error(`Error fetching image ${url}:`, error);
    }
  }
}

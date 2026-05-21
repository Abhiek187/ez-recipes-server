import jsPDF from "jspdf";

/**
 * Wrapper around jsPDF to help with arranging content & paginating
 */
export default class PDFCreate {
  // A4, portrait, and mm by default
  private readonly MARGIN = 12.7;
  private readonly DEFAULT_FONT = "helvetica";
  private readonly DEFAULT_FONT_SIZE = 16;
  private readonly DELTA_Y = 10;

  // Public in case jsPDF methods should be called directly
  doc = new jsPDF();
  private readonly pageWidth = this.doc.internal.pageSize.width;
  private readonly pageHeight = this.doc.internal.pageSize.height;
  private readonly maxLineWidth = this.pageWidth - this.MARGIN * 2;
  private docX = this.MARGIN;
  private deltaX = 25;
  private docY = this.MARGIN;
  private isLine = false;

  private newPage() {
    this.doc.addPage();
    this.docX = this.MARGIN;
    this.docY = this.MARGIN;
  }

  private newLine() {
    this.docX = this.MARGIN;
    this.docY += this.DELTA_Y;
  }

  private paginate(lines = 1) {
    // Need to paginate manually :(
    if (this.isLine) {
      this.docX += this.deltaX;
    } else {
      this.docY += this.DELTA_Y * lines;
    }

    if (this.docX >= this.pageWidth - this.MARGIN) {
      this.newLine();
    }
    if (this.docY >= this.pageHeight - this.MARGIN) {
      this.newPage();
    }
  }

  beginLine(delta = 25) {
    this.isLine = true;
    this.deltaX = delta;
  }

  endLine(lines = 1) {
    this.isLine = false;
    this.docX = this.MARGIN;
    this.paginate(lines);
  }

  text(
    text: string,
    {
      bold = false,
      size,
      align = "left",
      pill = false,
    }: {
      bold?: boolean;
      size?: number;
      align?: "left" | "center" | "right";
      pill?: boolean;
    } = {}
  ) {
    // Split long text across multiple lines
    const textLines = this.doc.splitTextToSize(text, this.maxLineWidth);
    // Check if there's enough room for all the text
    if (this.docX + this.deltaX >= this.pageWidth - this.MARGIN) {
      this.newLine();
    }
    if (
      this.docY + this.DELTA_Y * textLines.length >=
      this.pageHeight - this.MARGIN
    ) {
      this.newPage();
    }

    if (bold) this.doc.setFont(this.DEFAULT_FONT, "bold");
    if (size) this.doc.setFontSize(size);
    const docX =
      align === "left"
        ? this.docX
        : align === "center"
          ? this.pageWidth / 2
          : this.pageWidth - this.MARGIN;
    this.doc.text(textLines, docX, this.docY, {
      align,
    });
    if (pill) {
      const textSize = this.doc.getTextDimensions(text);
      this.doc.roundedRect(
        docX - 1.5,
        this.docY - textSize.h - 0.5,
        textSize.w + 3,
        textSize.h + 3,
        3,
        3
      );
    }

    if (bold) this.doc.setFont(this.DEFAULT_FONT, "normal");
    if (size) this.doc.setFontSize(this.DEFAULT_FONT_SIZE);
    this.paginate(textLines.length);
  }

  async addImage(
    url: string,
    width: number,
    height: number,
    {
      align = "left",
    }: {
      align?: "left" | "center" | "right";
    } = {}
  ) {
    try {
      // jsPDF reads local files by default, but we need to fetch the image remotely
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = response.headers.get("content-type") || "image/jpeg";
      const base64Image = `data:${mimeType};base64,${base64}`;

      // Check if there's enough room for the image
      if (this.docX + width >= this.pageWidth - this.MARGIN) {
        this.newLine();
      }
      if (this.docY + height >= this.pageHeight - this.MARGIN) {
        this.newPage();
      }

      const docX =
        align === "left"
          ? this.docX
          : align === "center"
            ? (this.pageWidth - width) / 2
            : this.pageWidth - width;
      this.doc.addImage(base64Image, "JPEG", docX, this.docY, width, height);
      this.paginate(height / 10 + 1);
    } catch (error) {
      console.error(`Error fetching image ${url}:`, error);
    }
  }

  divider() {
    this.doc.line(
      this.MARGIN,
      this.docY,
      this.pageWidth - this.MARGIN,
      this.docY
    );
    this.paginate();
  }
}

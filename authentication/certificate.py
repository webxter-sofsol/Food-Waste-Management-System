"""
Donation Receipt Generator
Generates a professional PDF receipt of donation using ReportLab.
"""
import io
from datetime import datetime, timezone, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)
from reportlab.pdfgen import canvas


# ── Brand colours ──────────────────────────────────────────────────────────────
GREEN_DARK  = colors.HexColor('#15803d')
GREEN_MID   = colors.HexColor('#16a34a')
GREEN_LIGHT = colors.HexColor('#dcfce7')
GOLD        = colors.HexColor('#b45309')
GREY_TEXT   = colors.HexColor('#374151')
GREY_LIGHT  = colors.HexColor('#f9fafb')
BORDER      = colors.HexColor('#bbf7d0')
GREY_MID    = colors.HexColor('#6b7280')


def _draw_border(c: canvas.Canvas, doc):
    """Draw a decorative double-border on every page."""
    w, h = A4
    margin = 1.2 * cm

    # Outer border
    c.setStrokeColor(GREEN_MID)
    c.setLineWidth(3)
    c.rect(margin, margin, w - 2 * margin, h - 2 * margin)

    # Inner border
    inner = margin + 0.4 * cm
    c.setStrokeColor(GREEN_LIGHT)
    c.setLineWidth(1)
    c.rect(inner, inner, w - 2 * inner, h - 2 * inner)

    # Corner ornaments
    c.setFillColor(GREEN_MID)
    for x, y in [(margin, margin), (w - margin, margin),
                 (margin, h - margin), (w - margin, h - margin)]:
        c.circle(x, y, 0.28 * cm, fill=1, stroke=0)


def generate_donation_certificate(
    donor_name: str,
    donor_email: str,
    food_type: str,
    quantity: int,
    unit: str,
    pickup_address: str,
    completed_at: datetime,
    match_id: int,
    receiver_name: str = '',
) -> bytes:
    """
    Generate a PDF donation receipt and return it as bytes.

    Parameters
    ----------
    donor_name      : Full name of the donor
    donor_email     : Email of the donor
    food_type       : Type of food donated
    quantity        : Quantity donated
    unit            : Unit (servings / kg / liters)
    pickup_address  : Pickup address of the listing
    completed_at    : Datetime when the match was completed
    match_id        : Match ID (used as receipt number)
    receiver_name   : Name of the receiving organisation
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.8 * cm,
        rightMargin=2.8 * cm,
        topMargin=2.8 * cm,
        bottomMargin=2.8 * cm,
    )

    styles = getSampleStyleSheet()

    # ── Resolved values (never blank) ─────────────────────────────────────────
    donor_name     = donor_name.strip()     or 'N/A'
    donor_email    = donor_email.strip()    or 'N/A'
    food_type      = food_type.strip()      or 'N/A'
    pickup_address = pickup_address.strip() if pickup_address else 'N/A'
    receiver_name  = receiver_name.strip()  if receiver_name  else 'N/A'
    unit           = unit.strip()           or 'servings'

    IST = timezone(timedelta(hours=5, minutes=30))
    now          = (completed_at or datetime.utcnow().replace(tzinfo=timezone.utc)).astimezone(IST)
    date_str     = now.strftime('%B %d, %Y')
    time_str     = now.strftime('%I:%M %p IST')
    datetime_str = f'{date_str}   {time_str}'
    receipt_no   = f'FS-{match_id:06d}'

    # ── Custom styles (generous leading / spacing throughout) ─────────────────
    org_style = ParagraphStyle(
        'OrgName',
        parent=styles['Normal'],
        fontSize=15,
        textColor=GREEN_MID,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=22,
        spaceAfter=6,
    )
    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Title'],
        fontSize=30,
        textColor=GREEN_DARK,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=40,
        spaceBefore=4,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        'ReceiptSubtitle',
        parent=styles['Normal'],
        fontSize=13,
        textColor=GOLD,
        alignment=TA_CENTER,
        fontName='Helvetica-BoldOblique',
        leading=22,
        spaceBefore=2,
        spaceAfter=8,
    )
    donor_name_style = ParagraphStyle(
        'DonorName',
        parent=styles['Normal'],
        fontSize=22,
        textColor=GREEN_DARK,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=32,
        spaceBefore=10,
        spaceAfter=10,
    )
    body_center = ParagraphStyle(
        'BodyCenter',
        parent=styles['Normal'],
        fontSize=11,
        textColor=GREY_TEXT,
        alignment=TA_CENTER,
        leading=22,          # generous line height
        spaceBefore=4,
        spaceAfter=4,
    )
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GREY_MID,
        fontName='Helvetica',
        alignment=TA_LEFT,
        leading=16,
    )
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=11,
        textColor=GREY_TEXT,
        fontName='Helvetica-Bold',
        alignment=TA_LEFT,
        leading=18,
    )
    sig_line_style = ParagraphStyle(
        'SigLine',
        parent=styles['Normal'],
        fontSize=12,
        textColor=GREEN_DARK,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        leading=20,
        spaceAfter=4,
    )
    sig_label_style = ParagraphStyle(
        'SigLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GREY_MID,
        fontName='Helvetica',
        alignment=TA_CENTER,
        leading=16,
        spaceBefore=2,
    )
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#9ca3af'),
        alignment=TA_CENTER,
        leading=14,
        spaceAfter=3,
    )

    # ── Content ────────────────────────────────────────────────────────────────
    story = []

    # ── Header: org name ──────────────────────────────────────────────────────
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph('🌿  FoodShare', org_style))
    story.append(Spacer(1, 0.3 * cm))

    # ── Title block ───────────────────────────────────────────────────────────
    story.append(Paragraph('Donation Receipt', title_style))
    story.append(Spacer(1, 0.15 * cm))
    story.append(Paragraph('This is to acknowledge that', subtitle_style))
    story.append(Spacer(1, 0.3 * cm))

    # ── Donor name hero ───────────────────────────────────────────────────────
    story.append(HRFlowable(
        width='65%', thickness=1.2, color=BORDER,
        spaceAfter=4, spaceBefore=4,
    ))
    story.append(Paragraph(donor_name, donor_name_style))
    story.append(HRFlowable(
        width='65%', thickness=1.2, color=BORDER,
        spaceAfter=4, spaceBefore=4,
    ))

    story.append(Spacer(1, 0.6 * cm))

    # ── Body text ─────────────────────────────────────────────────────────────
    story.append(Paragraph(
        'has generously donated food to the FoodShare community,<br/>'
        'helping reduce food waste and supporting those in need.',
        body_center,
    ))

    story.append(Spacer(1, 0.9 * cm))

    # ── Details table ─────────────────────────────────────────────────────────
    rows = [
        ('Receipt No.',     receipt_no),
        ('Donor Name',      donor_name),
        ('Donor Email',     donor_email),
        ('Food Donated',    food_type),
        ('Quantity',        f'{quantity} {unit}'),
        ('Pickup Location', pickup_address),
        ('Received By',     receiver_name),
        ('Date & Time',     datetime_str),
    ]

    table_data = [
        [Paragraph(lbl, label_style), Paragraph(val, value_style)]
        for lbl, val in rows
    ]

    tbl = Table(table_data, colWidths=[4.8 * cm, 10.6 * cm])
    tbl.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, GREY_LIGHT]),
        ('GRID',           (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN',         (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',     (0, 0), (-1, -1), 10),   # more vertical padding
        ('BOTTOMPADDING',  (0, 0), (-1, -1), 10),
        ('LEFTPADDING',    (0, 0), (-1, -1), 12),
        ('RIGHTPADDING',   (0, 0), (-1, -1), 12),
    ]))
    story.append(tbl)

    story.append(Spacer(1, 0.9 * cm))

    # ── Appreciation message ──────────────────────────────────────────────────
    story.append(Paragraph(
        'Your contribution makes a real difference.<br/>'
        'Thank you for your kindness and generosity.',
        body_center,
    ))

    story.append(Spacer(1, 1.1 * cm))

    # ── Signature block ───────────────────────────────────────────────────────
    def _sig_col(heading, sub1, sub2, width):
        return Table(
            [
                [Paragraph(heading, sig_line_style)],
                [HRFlowable(width='90%', thickness=1, color=GREEN_MID,
                            spaceAfter=5, spaceBefore=5)],
                [Paragraph(sub1, sig_label_style)],
                [Paragraph(sub2, sig_label_style)],
            ],
            colWidths=[width],
            style=TableStyle([
                ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING',    (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]),
        )

    sig_table = Table(
        [[
            _sig_col('FoodShare Admin',  'Authorised Signatory', 'FoodShare Platform', 7.5 * cm),
            _sig_col(date_str,           'Date of Issue',         time_str,             7.5 * cm),
        ]],
        colWidths=[8.2 * cm, 8.2 * cm],
    )
    sig_table.setStyle(TableStyle([
        ('ALIGN',  (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(sig_table)

    story.append(Spacer(1, 1.0 * cm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER,
                            spaceAfter=6, spaceBefore=4))
    story.append(Paragraph(
        f'Receipt No: {receipt_no}  •  Issued: {date_str}  •  '
        f'FoodShare — Connecting donors with those in need',
        footer_style,
    ))
    story.append(Paragraph(
        f'Donor: {donor_name}   ({donor_email})',
        footer_style,
    ))

    # ── Build PDF ──────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=_draw_border, onLaterPages=_draw_border)
    return buffer.getvalue()

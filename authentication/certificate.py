"""
Donation Receipt Generator
Generates a professional PDF receipt of donation using ReportLab.
"""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
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
    inner = margin + 0.35 * cm
    c.setStrokeColor(GREEN_LIGHT)
    c.setLineWidth(1)
    c.rect(inner, inner, w - 2 * inner, h - 2 * inner)

    # Corner ornaments
    c.setFillColor(GREEN_MID)
    for x, y in [(margin, margin), (w - margin, margin),
                 (margin, h - margin), (w - margin, h - margin)]:
        c.circle(x, y, 0.25 * cm, fill=1, stroke=0)


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
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()

    # ── Resolved values (never blank) ─────────────────────────────────────────
    donor_name     = donor_name.strip()    or 'N/A'
    donor_email    = donor_email.strip()   or 'N/A'
    food_type      = food_type.strip()     or 'N/A'
    pickup_address = pickup_address.strip() if pickup_address else 'N/A'
    receiver_name  = receiver_name.strip() if receiver_name else 'N/A'
    unit           = unit.strip()          or 'servings'

    now            = completed_at or datetime.utcnow()
    date_str       = now.strftime('%B %d, %Y')
    time_str       = now.strftime('%I:%M %p UTC')
    datetime_str   = f'{date_str}  {time_str}'
    receipt_no     = f'FS-{match_id:06d}'

    # ── Custom styles ──────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=GREEN_DARK,
        spaceAfter=4,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
    )
    subtitle_style = ParagraphStyle(
        'ReceiptSubtitle',
        parent=styles['Normal'],
        fontSize=13,
        textColor=GOLD,
        spaceAfter=2,
        alignment=TA_CENTER,
        fontName='Helvetica-BoldOblique',
    )
    body_center = ParagraphStyle(
        'BodyCenter',
        parent=styles['Normal'],
        fontSize=11,
        textColor=GREY_TEXT,
        alignment=TA_CENTER,
        leading=18,
    )
    donor_name_style = ParagraphStyle(
        'DonorName',
        parent=styles['Normal'],
        fontSize=22,
        textColor=GREEN_DARK,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        spaceBefore=6,
        spaceAfter=6,
    )
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GREY_MID,
        fontName='Helvetica',
        alignment=TA_LEFT,
    )
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=11,
        textColor=GREY_TEXT,
        fontName='Helvetica-Bold',
        alignment=TA_LEFT,
    )
    sig_name_style = ParagraphStyle(
        'SigName',
        parent=styles['Normal'],
        fontSize=11,
        textColor=GREEN_DARK,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
    )
    sig_label_style = ParagraphStyle(
        'SigLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GREY_MID,
        fontName='Helvetica',
        alignment=TA_CENTER,
    )
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#9ca3af'),
        alignment=TA_CENTER,
    )

    # ── Content ────────────────────────────────────────────────────────────────
    story = []

    # Org name / logo
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph('🌿 FoodShare', ParagraphStyle(
        'OrgName', parent=styles['Normal'],
        fontSize=16, textColor=GREEN_MID,
        alignment=TA_CENTER, fontName='Helvetica-Bold',
    )))
    story.append(Spacer(1, 0.3 * cm))

    # Title
    story.append(Paragraph('Donation Receipt', title_style))
    story.append(Paragraph('This is to acknowledge that', subtitle_style))
    story.append(Spacer(1, 0.2 * cm))

    # Donor name (hero element)
    story.append(HRFlowable(width='60%', thickness=1, color=BORDER, spaceAfter=6))
    story.append(Paragraph(donor_name, donor_name_style))
    story.append(HRFlowable(width='60%', thickness=1, color=BORDER, spaceBefore=6))

    story.append(Spacer(1, 0.5 * cm))

    # Body text
    story.append(Paragraph(
        'has generously donated food to the FoodShare community, '
        'helping reduce food waste and supporting those in need.',
        body_center,
    ))

    story.append(Spacer(1, 0.8 * cm))

    # ── Details table ─────────────────────────────────────────────────────────
    rows = [
        ('Receipt No.',      receipt_no),
        ('Donor Name',       donor_name),
        ('Donor Email',      donor_email),
        ('Food Donated',     food_type),
        ('Quantity',         f'{quantity} {unit}'),
        ('Pickup Location',  pickup_address),
        ('Received By',      receiver_name),
        ('Date & Time',      datetime_str),
    ]

    table_data = []
    for label, value in rows:
        table_data.append([
            Paragraph(label, label_style),
            Paragraph(value, value_style),
        ])

    tbl = Table(table_data, colWidths=[4.5 * cm, 11 * cm])
    tbl.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, GREY_LIGHT]),
        ('GRID',           (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN',         (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',     (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING',  (0, 0), (-1, -1), 7),
        ('LEFTPADDING',    (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',   (0, 0), (-1, -1), 10),
    ]))
    story.append(tbl)

    story.append(Spacer(1, 0.8 * cm))

    # Appreciation message
    story.append(Paragraph(
        'Your contribution makes a real difference. '
        'Thank you for your kindness and generosity.',
        body_center,
    ))

    story.append(Spacer(1, 1.0 * cm))

    # ── Signature block ───────────────────────────────────────────────────────
    # Left column: Admin signature  |  Right column: Issue date
    sig_line = ParagraphStyle(
        'SigLine', parent=styles['Normal'],
        fontSize=11, textColor=GREEN_DARK,
        fontName='Helvetica-Bold', alignment=TA_CENTER,
    )

    sig_table = Table(
        [[
            # Admin signature column
            Table(
                [
                    [Paragraph('FoodShare Admin', sig_line)],
                    [HRFlowable(width='100%', thickness=1, color=GREEN_MID)],
                    [Paragraph('Authorised Signatory', sig_label_style)],
                    [Paragraph('FoodShare Platform', sig_label_style)],
                ],
                colWidths=[7.5 * cm],
                style=TableStyle([
                    ('ALIGN',   (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN',  (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING',    (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ]),
            ),
            # Date column
            Table(
                [
                    [Paragraph(date_str, sig_line)],
                    [HRFlowable(width='100%', thickness=1, color=GREEN_MID)],
                    [Paragraph('Date of Issue', sig_label_style)],
                    [Paragraph(time_str, sig_label_style)],
                ],
                colWidths=[7.5 * cm],
                style=TableStyle([
                    ('ALIGN',   (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN',  (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING',    (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ]),
            ),
        ]],
        colWidths=[8 * cm, 8 * cm],
    )
    sig_table.setStyle(TableStyle([
        ('ALIGN',  (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(sig_table)

    story.append(Spacer(1, 0.8 * cm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        f'Receipt No: {receipt_no}  •  Issued: {date_str}  •  '
        f'FoodShare — Connecting donors with those in need',
        footer_style,
    ))
    story.append(Paragraph(
        f'Donor: {donor_name}  ({donor_email})',
        footer_style,
    ))

    # ── Build PDF ──────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=_draw_border, onLaterPages=_draw_border)
    return buffer.getvalue()

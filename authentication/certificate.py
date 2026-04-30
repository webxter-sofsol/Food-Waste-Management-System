"""
Donation Certificate Generator
Generates a professional PDF certificate of donation using ReportLab.
"""
import io
from datetime import datetime
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
    Generate a PDF donation certificate and return it as bytes.

    Parameters
    ----------
    donor_name      : Full name of the donor
    donor_email     : Email of the donor
    food_type       : Type of food donated
    quantity        : Quantity donated
    unit            : Unit (servings / kg / liters)
    pickup_address  : Pickup address of the listing
    completed_at    : Datetime when the match was completed
    match_id        : Match ID (used as certificate number)
    receiver_name   : Name of the receiving organisation (optional)
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

    # ── Custom styles ──────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        'CertTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=GREEN_DARK,
        spaceAfter=4,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
    )
    subtitle_style = ParagraphStyle(
        'CertSubtitle',
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
        textColor=colors.HexColor('#6b7280'),
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
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#9ca3af'),
        alignment=TA_CENTER,
    )

    # ── Content ────────────────────────────────────────────────────────────────
    story = []

    # Logo / org name
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph('🌿 FoodShare', ParagraphStyle(
        'OrgName', parent=styles['Normal'],
        fontSize=16, textColor=GREEN_MID,
        alignment=TA_CENTER, fontName='Helvetica-Bold',
    )))
    story.append(Spacer(1, 0.3 * cm))

    # Title
    story.append(Paragraph('Certificate of Donation', title_style))
    story.append(Paragraph('This is to certify that', subtitle_style))
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

    # ── Details table ──────────────────────────────────────────────────────────
    date_str = completed_at.strftime('%B %d, %Y') if completed_at else '—'
    time_str = completed_at.strftime('%I:%M %p UTC') if completed_at else ''

    rows = [
        ('Food Donated',    f'{food_type}'),
        ('Quantity',        f'{quantity} {unit}'),
        ('Pickup Location', pickup_address or '—'),
        ('Date of Donation', f'{date_str}  {time_str}'),
    ]
    if receiver_name:
        rows.append(('Received By', receiver_name))

    table_data = []
    for label, value in rows:
        table_data.append([
            Paragraph(label, label_style),
            Paragraph(value, value_style),
        ])

    tbl = Table(table_data, colWidths=[4.5 * cm, 11 * cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GREY_LIGHT),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, GREY_LIGHT]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [4]),
    ]))
    story.append(tbl)

    story.append(Spacer(1, 1 * cm))

    # Appreciation message
    story.append(Paragraph(
        'Your contribution makes a real difference. '
        'Thank you for your kindness and generosity.',
        body_center,
    ))

    story.append(Spacer(1, 1.2 * cm))

    # Signature line
    sig_table = Table(
        [[
            Paragraph('_______________________', body_center),
            Paragraph('_______________________', body_center),
        ]],
        colWidths=[8 * cm, 8 * cm],
    )
    sig_table.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
    story.append(sig_table)

    sig_labels = Table(
        [[
            Paragraph('FoodShare Administrator', ParagraphStyle(
                'SigLabel', parent=styles['Normal'],
                fontSize=9, textColor=GREY_TEXT, alignment=TA_CENTER,
            )),
            Paragraph('Date', ParagraphStyle(
                'SigLabel2', parent=styles['Normal'],
                fontSize=9, textColor=GREY_TEXT, alignment=TA_CENTER,
            )),
        ]],
        colWidths=[8 * cm, 8 * cm],
    )
    story.append(sig_labels)

    story.append(Spacer(1, 1 * cm))

    # Footer
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        f'Certificate No: FS-{match_id:06d}  •  Issued: {date_str}  •  '
        f'FoodShare — Connecting donors with those in need',
        footer_style,
    ))
    story.append(Paragraph(donor_email, footer_style))

    # ── Build PDF ──────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=_draw_border, onLaterPages=_draw_border)
    return buffer.getvalue()

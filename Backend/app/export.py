import io
#import pandas as pd
#import matplotlib
#matplotlib.use('Agg') # Server-safe headless backend
#import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_pie_chart_img(summary):
    """
    Generate object classification pie chart as bytes buffer.
    """
    class_freq = summary.get("class_frequency", [])
    if not class_freq:
        return None
        
    labels = [item['class_name'].capitalize() for item in class_freq[:6]]
    sizes = [item['count'] for item in class_freq[:6]]
    
    # Modern color palette matching the UI
    colors_palette = ['#7c3aed', '#00f2fe', '#ff5a5f', '#34d399', '#fbbf24', '#a78bfa']
    
    plt.figure(figsize=(4.5, 3.2))
    plt.pie(
        sizes, 
        labels=labels, 
        colors=colors_palette[:len(labels)], 
        autopct='%1.0f%%', 
        startangle=140,
        textprops={'fontsize': 9, 'color': '#0f172a'}
    )
    plt.title("Classification Ratio", fontsize=11, fontweight='bold', pad=10)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', transparent=True)
    plt.close()
    buf.seek(0)
    return buf

def generate_timeline_chart_img(summary):
    """
    Generate daily/hourly trend line chart as bytes buffer.
    """
    timeline = summary.get("hourly_timeline", [])
    if not timeline:
        return None
        
    hours = [item['hour'] for item in timeline]
    counts = [item['count'] for item in timeline]
    
    plt.figure(figsize=(7.5, 2.5))
    plt.plot(hours, counts, color='#7c3aed', marker='o', linewidth=2, markersize=4)
    plt.fill_between(hours, counts, color='#7c3aed', alpha=0.15)
    
    plt.title("Detection Activity Trends (24h)", fontsize=11, fontweight='bold', pad=10)
    plt.grid(True, linestyle='--', alpha=0.15)
    plt.xticks(rotation=0, fontsize=8)
    plt.yticks(fontsize=8)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', transparent=True)
    plt.close()
    buf.seek(0)
    return buf

def generate_csv_report(logs):
    """
    Generate CSV string from logs database.
    """
    if not logs:
        return "timestamp,track_id,class_name,confidence,source,event_type\n"
        
    df = pd.DataFrame(logs)
    columns_to_export = ['timestamp', 'track_id', 'class_name', 'confidence', 'source', 'event_type']
    df = df[[col for col in columns_to_export if col in df.columns]]
    
    output = io.StringIO()
    df.to_csv(output, index=False)
    return output.getvalue()

def generate_pdf_report(summary, logs):
    """
    Generate PDF report as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=36, 
        leftMargin=36,
        topMargin=36, 
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=colors.HexColor('#1e293b'), # Dark corporate Slate
        spaceAfter=5
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#64748b'), # Muted Slate
        spaceAfter=15
    )
    
    heading_style = ParagraphStyle(
        'DocHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.white,
        backColor=colors.HexColor('#0f172a'),
        borderPadding=6,
        spaceBefore=12,
        spaceAfter=8
    )

    story = []
    
    # Title & Subtitle
    story.append(Paragraph("AURATRACK.AI - System Telemetry Audit Report", title_style))
    story.append(Paragraph(f"Generated: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')} | Target: Surveillance Analytics Log History", subtitle_style))
    story.append(Spacer(1, 5))
    
    # Summary Metrics Cards
    story.append(Paragraph("Operational Telemetry Summary", heading_style))
    summary_data = [
        ["Metric", "Value", "Description"],
        ["Total Unique Objects Tracked", str(summary.get("unique_objects", 0)), "Distinct object classes and instances logged"],
        ["Total Object Detections", str(summary.get("total_detections", 0)), "Total occurrences detected across all frames"],
        ["Counting Line Crossings", str(summary.get("total_crossings", 0)), "Objects verified crossing set counting limits"],
        ["Average Detection Confidence", f"{int(summary.get('average_accuracy', 0.0) * 100)}%", "Mean evaluation confidence score"]
    ]
    
    t_summary = Table(summary_data, colWidths=[2.5*inch, 1.2*inch, 3.8*inch])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0,1), (-1,-1), colors.HexColor('#0f172a')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('TOPPADDING', (0,1), (-1,-1), 5),
        ('BOTTOMPADDING', (0,1), (-1,-1), 5),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 10))
    
    # Charts & Breakdown side-by-side
    story.append(Paragraph("Classification Distribution Details", heading_style))
    
    # Generate Pie Chart image
    pie_img = None
    pie_buf = generate_pie_chart_img(summary)
    if pie_buf:
        pie_img = Image(pie_buf, width=3.3*inch, height=2.3*inch)
        
    # Table breakdown
    freq_data = [["Class Name", "Count", "Avg Conf"]]
    for item in summary.get("class_frequency", []):
        freq_data.append([
            item['class_name'].capitalize(), 
            str(item['count']), 
            f"{int(item['avg_confidence']*100)}%"
        ])
    if len(freq_data) == 1:
        freq_data.append(["N/A", "0", "0%"])
        
    t_freq = Table(freq_data, colWidths=[1.5*inch, 1.0*inch, 1.0*inch])
    t_freq.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TEXTCOLOR', (0,1), (-1,-1), colors.HexColor('#334155')),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    
    # Layout Table: Pie Chart in Col 1, Table in Col 2
    layout_data = [[pie_img or "No chart data", t_freq]]
    t_layout = Table(layout_data, colWidths=[3.8*inch, 3.7*inch])
    t_layout.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_layout)
    story.append(Spacer(1, 5))
    
    # Hourly Timeline Line Chart
    timeline_buf = generate_timeline_chart_img(summary)
    if timeline_buf:
        story.append(Paragraph("System Load Timeline", heading_style))
        timeline_img = Image(timeline_buf, width=7.3*inch, height=2.3*inch)
        story.append(timeline_img)
        story.append(Spacer(1, 10))
    
    # Recent logs list
    story.append(Paragraph("Recent Historical Logs", heading_style))
    log_data = [["Timestamp", "Track ID", "Class", "Conf", "Event Type", "Source"]]
    for log in logs[:12]:
        try:
            ts = pd.to_datetime(log['timestamp']).strftime('%Y-%m-%d %H:%M:%S')
        except:
            ts = log['timestamp']
            
        log_data.append([
            ts,
            f"#{log['track_id']}",
            log['class_name'].capitalize(),
            f"{int(log['confidence']*100)}%",
            log['event_type'].upper(),
            log['source']
        ])
        
    if len(log_data) == 1:
        log_data.append(["No logs found", "-", "-", "-", "-", "-"])
        
    t_log = Table(log_data, colWidths=[1.8*inch, 0.8*inch, 1.2*inch, 0.8*inch, 1.2*inch, 1.7*inch])
    t_log.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TEXTCOLOR', (0,1), (-1,-1), colors.HexColor('#0f172a')),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,1), (-1,-1), 4),
        ('BOTTOMPADDING', (0,1), (-1,-1), 4),
    ]))
    story.append(t_log)
    
    # Build document
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface WeeklyProgression {
  week: number;
  parameters: any;
  lab_report: any;
  changes_from_baseline: any;
}

interface SimulationResult {
  result_id: string;
  simulation_duration: string;
  weekly_progression?: WeeklyProgression[];
  ai_progression_analysis?: string;
  improvements?: string[];
  recommendations?: string[];
  baseline_report?: any;
  projected_report?: any;
}

export class ReportGenerator {
  private pdf: jsPDF;
  private currentY: number = 20;
  private pageHeight: number = 297; // A4 height in mm
  private pageWidth: number = 210; // A4 width in mm
  private margin: number = 20;

  constructor() {
    this.pdf = new jsPDF();
  }

  async generateSimulationReport(result: SimulationResult, includeCharts: boolean = true): Promise<void> {
    try {
      // Add title page
      this.addTitlePage(result);

      // Add executive summary
      this.addExecutiveSummary(result);

      // Add weekly progression data if available
      if (result.weekly_progression) {
        await this.addWeeklyProgressionSection(result.weekly_progression);
      }

      // Add baseline vs final comparison
      this.addHealthComparison(result);

      // Add improvements and recommendations
      this.addImprovementsSection(result);

      // Add AI analysis
      if (result.ai_progression_analysis) {
        this.addAIAnalysisSection(result.ai_progression_analysis);
      }

      // Add charts if requested
      if (includeCharts && result.weekly_progression) {
        await this.addChartsSection(result.weekly_progression);
      }

      // Add footer to all pages
      this.addFooterToAllPages();

    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  private addTitlePage(result: SimulationResult): void {
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Health Simulation Report', this.pageWidth / 2, 50, { align: 'center' });

    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Digital Twin Health Analysis', this.pageWidth / 2, 70, { align: 'center' });

    // Report details
    this.pdf.setFontSize(12);
    this.currentY = 100;
    this.addText(`Report ID: ${result.result_id || 'N/A'}`);
    this.addText(`Simulation Duration: ${result.simulation_duration || 'N/A'}`);
    this.addText(`Generated: ${new Date().toLocaleDateString()}`);

    // Add logo placeholder
    this.pdf.setFillColor(66, 139, 202);
    this.pdf.rect(this.pageWidth / 2 - 25, 130, 50, 30, 'F');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(14);
    this.pdf.text('HEALTH TWIN', this.pageWidth / 2, 148, { align: 'center' });
    this.pdf.setTextColor(0, 0, 0);

    this.addNewPage();
  }

  private addExecutiveSummary(result: SimulationResult): void {
    this.addSectionHeader('Executive Summary');

    if (result.weekly_progression && result.weekly_progression.length > 0) {
      const firstWeek = result.weekly_progression[0];
      const lastWeek = result.weekly_progression[result.weekly_progression.length - 1];

      this.addText('This report presents a comprehensive analysis of your health simulation results over ' + 
                   `${result.weekly_progression.length} weeks. The simulation tracked various health parameters ` +
                   'and provides insights into potential health improvements.');

      this.addText('');
      this.addSubHeader('Key Highlights:');
      
      // Calculate key metrics
      const bloodPressureImprovement = this.calculateImprovement(
        firstWeek.parameters?.vitals?.blood_pressure_systolic,
        lastWeek.parameters?.vitals?.blood_pressure_systolic
      );

      if (bloodPressureImprovement !== null) {
        this.addBulletPoint(`Blood Pressure: ${bloodPressureImprovement > 0 ? 'Improved' : 'Changed'} by ${Math.abs(bloodPressureImprovement).toFixed(1)} mmHg`);
      }

      if (result.improvements && result.improvements.length > 0) {
        result.improvements.slice(0, 3).forEach(improvement => {
          this.addBulletPoint(improvement);
        });
      }
    }

    this.addText('');
  }

  private async addWeeklyProgressionSection(weeklyProgression: WeeklyProgression[]): Promise<void> {
    this.addSectionHeader('Weekly Progression Analysis');

    this.addText('The following table shows the progression of key health metrics over time:');
    this.addText('');

    // Create a simple table
    const headers = ['Week', 'Blood Pressure', 'Heart Rate', 'Glucose', 'Weight'];
    this.addTableHeader(headers);

    weeklyProgression.forEach(week => {
      const data = [
        week.week.toString(),
        `${week.parameters?.vitals?.blood_pressure_systolic || 'N/A'}/${week.parameters?.vitals?.blood_pressure_diastolic || 'N/A'}`,
        `${week.parameters?.vitals?.heart_rate || 'N/A'} BPM`,
        `${week.parameters?.metabolic?.glucose_fasting || 'N/A'} mg/dL`,
        `${week.parameters?.physical?.weight_kg || 'N/A'} kg`
      ];
      this.addTableRow(data);
    });

    this.addText('');
  }

  private addHealthComparison(result: SimulationResult): void {
    this.addSectionHeader('Health Comparison');

    if (result.weekly_progression && result.weekly_progression.length > 0) {
      const baseline = result.weekly_progression[0];
      const final = result.weekly_progression[result.weekly_progression.length - 1];

      this.addSubHeader('Baseline vs Final Health Metrics:');
      this.addText('');

      // Comparison table
      const comparisonData = [
        ['Metric', 'Baseline', 'Final', 'Change'],
        [
          'Blood Pressure',
          `${baseline.parameters?.vitals?.blood_pressure_systolic || 'N/A'}/${baseline.parameters?.vitals?.blood_pressure_diastolic || 'N/A'}`,
          `${final.parameters?.vitals?.blood_pressure_systolic || 'N/A'}/${final.parameters?.vitals?.blood_pressure_diastolic || 'N/A'}`,
          this.calculateChangeText(baseline.parameters?.vitals?.blood_pressure_systolic, final.parameters?.vitals?.blood_pressure_systolic)
        ],
        [
          'Heart Rate',
          `${baseline.parameters?.vitals?.heart_rate || 'N/A'} BPM`,
          `${final.parameters?.vitals?.heart_rate || 'N/A'} BPM`,
          this.calculateChangeText(baseline.parameters?.vitals?.heart_rate, final.parameters?.vitals?.heart_rate)
        ],
        [
          'Glucose',
          `${baseline.parameters?.metabolic?.glucose_fasting || 'N/A'} mg/dL`,
          `${final.parameters?.metabolic?.glucose_fasting || 'N/A'} mg/dL`,
          this.calculateChangeText(baseline.parameters?.metabolic?.glucose_fasting, final.parameters?.metabolic?.glucose_fasting)
        ]
      ];

      comparisonData.forEach((row, index) => {
        if (index === 0) {
          this.addTableHeader(row);
        } else {
          this.addTableRow(row);
        }
      });
    }

    this.addText('');
  }

  private addImprovementsSection(result: SimulationResult): void {
    this.addSectionHeader('Improvements & Recommendations');

    if (result.improvements && result.improvements.length > 0) {
      this.addSubHeader('Key Improvements:');
      result.improvements.forEach(improvement => {
        this.addBulletPoint(improvement);
      });
      this.addText('');
    }

    if (result.recommendations && result.recommendations.length > 0) {
      this.addSubHeader('Recommendations:');
      result.recommendations.forEach(recommendation => {
        this.addBulletPoint(recommendation);
      });
      this.addText('');
    }
  }

  private addAIAnalysisSection(aiAnalysis: string): void {
    this.addSectionHeader('AI Analysis & Insights');

    // Clean and format AI analysis
    const cleanedAnalysis = aiAnalysis
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const sections = cleanedAnalysis.split(/\d+\.\s+/).filter(section => section.trim());

    sections.forEach((section, index) => {
      if (section.trim()) {
        const lines = section.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          // First line as subtitle
          this.addSubHeader(`${index + 1}. ${lines[0].replace(/:/g, '').trim()}`);
          
          // Rest as content
          lines.slice(1).forEach(line => {
            if (line.trim()) {
              this.addText(line.trim());
            }
          });
          this.addText('');
        }
      }
    });
  }

  private async addChartsSection(weeklyProgression: WeeklyProgression[]): Promise<void> {
    this.addSectionHeader('Visual Charts & Trends');

    this.addText('The following charts show the progression of key health metrics over the simulation period:');
    this.addText('');

    // Define chart configurations using the same pattern as WeeklyProgressionCharts
    const chartConfigs = [
      {
        title: 'Blood Pressure Systolic Trend',
        category: 'vitals',
        metric: 'blood_pressure_systolic',
        unit: 'mmHg',
        color: '#e74c3c'
      },
      {
        title: 'Heart Rate Trend',
        category: 'vitals',
        metric: 'heart_rate',
        unit: 'BPM',
        color: '#3498db'
      },
      {
        title: 'Fasting Glucose Trend',
        category: 'metabolic',
        metric: 'glucose_fasting',
        unit: 'mg/dL',
        color: '#f39c12'
      },
      {
        title: 'LDL Cholesterol Trend',
        category: 'lipids',
        metric: 'ldl',
        unit: 'mg/dL',
        color: '#9b59b6'
      }
    ];

    // Generate each chart
    for (const config of chartConfigs) {
      try {
        await this.generateAndAddChart(weeklyProgression, config);
      } catch (error) {
        console.error(`Error generating ${config.title}:`, error);
        this.addText(`Chart for ${config.title} could not be generated.`);
        this.addText('');
      }
    }
  }

  private async generateAndAddChart(weeklyProgression: WeeklyProgression[], config: any): Promise<void> {
    try {
      // Debug: inspect the full data structure
      console.log('=== CHART DEBUG START ===');
      console.log('Chart config:', config.title);
      console.log('Weekly progression length:', weeklyProgression.length);
      
      // Show first and last week to see differences
      console.log('First week structure:', JSON.stringify(weeklyProgression[0], null, 2));
      if (weeklyProgression.length > 1) {
        console.log('Last week structure:', JSON.stringify(weeklyProgression[weeklyProgression.length - 1], null, 2));
      }
      
      // Show all possible values for the first metric
      console.log('Searching for values in all weeks...');
      weeklyProgression.forEach((week, idx) => {
        console.log(`Week ${week.week} full structure:`, {
          parameters: week.parameters,
          lab_report: week.lab_report ? Object.keys(week.lab_report) : 'no lab_report'
        });
      });
      
      // Create a proper canvas element
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Draw the chart
      this.drawEnhancedChart(ctx, weeklyProgression, config);
      
      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');
      
      // Add chart to PDF
      this.checkPageSpace(120);
      this.addSubHeader(config.title);
      this.pdf.addImage(imgData, 'PNG', this.margin, this.currentY, 170, 85);
      this.currentY += 100;
      
      // Add a small gap after each chart
      this.addText('');
      
      console.log('=== CHART DEBUG END ===');
      console.log('');
      
    } catch (error) {
      console.error(`Error generating chart for ${config.title}:`, error);
      this.addText(`Chart for ${config.title} could not be generated.`);
      this.addText('');
    }
  }

  private extractValueFromPath(week: WeeklyProgression, path: any): number | undefined {
    const { category, metric } = path;
    
    try {
      // Handle dot notation paths like 'vital_signs.heart_rate.value'
      const parts = metric.split('.');
      let current: any = week;
      
      // Navigate to the category first
      if (category === 'vitals') {
        current = week.parameters?.vitals;
      } else if (category === 'metabolic') {
        current = week.parameters?.metabolic;
      } else if (category === 'physical') {
        current = week.parameters?.physical;
      } else if (category === 'lifestyle') {
        current = week.parameters?.lifestyle;
      } else if (category === 'lab_report') {
        current = week.lab_report;
      } else if (category === 'parameters') {
        current = week.parameters;
      }
      
      // Navigate through the path parts
      for (const part of parts) {
        if (current && typeof current === 'object') {
          current = current[part];
        } else {
          return undefined;
        }
      }
      
      return typeof current === 'number' ? current : undefined;
    } catch (error) {
      console.error('Error extracting value from path:', error);
      return undefined;
    }
  }

  private findValueAnywhere(obj: any, targetKeys: string[]): number | undefined {
    // Recursively search for any of the target keys in the object
    const search = (current: any, depth: number = 0): number | undefined => {
      if (depth > 10) return undefined; // Prevent infinite recursion
      
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      
      // Check if any target key exists at this level
      for (const key of targetKeys) {
        if (key in current && typeof current[key] === 'number') {
          console.log(`Found ${key} = ${current[key]} at depth ${depth}`);
          return current[key];
        }
      }
      
      // Recursively search in nested objects
      for (const [key, value] of Object.entries(current)) {
        if (value && typeof value === 'object') {
          const found = search(value, depth + 1);
          if (found !== undefined) {
            return found;
          }
        }
      }
      
      return undefined;
    };
    
    return search(obj);
  }

  private getMetricDataFromWeek(week: WeeklyProgression, category: string, metric: string): number | undefined {
    // Use the exact same extraction logic as WeeklyProgressionCharts
    try {
      if (category === 'vitals') {
        return week.lab_report?.vital_signs?.[metric]?.value || week.parameters?.vitals?.[metric];
      } else if (category === 'metabolic') {
        return week.lab_report?.comprehensive_metabolic_panel?.[metric]?.value || week.parameters?.metabolic?.[metric];
      } else if (category === 'lipids') {
        return week.lab_report?.lipid_panel?.[metric]?.value || week.parameters?.lipids?.[metric];
      } else if (category === 'cbc') {
        return week.lab_report?.complete_blood_count?.[metric]?.value || week.parameters?.cbc?.[metric];
      } else if (category === 'liver') {
        return week.lab_report?.liver_function?.[metric]?.value || week.parameters?.liver?.[metric];
      } else if (category === 'thyroid') {
        return week.lab_report?.thyroid_function?.[metric]?.value || week.parameters?.thyroid?.[metric];
      } else if (category === 'lifestyle') {
        return week.parameters?.lifestyle?.[metric];
      } else if (category === 'physical') {
        return week.parameters?.physical?.[metric];
      }
      return undefined;
    } catch (error) {
      console.error(`Error getting metric data for ${category}.${metric}:`, error);
      return undefined;
    }
  }

  private getBaseValueForMetric(title: string): number {
    // Return realistic base values for different health metrics
    if (title.includes('Blood Pressure')) {
      return 120; // Typical systolic BP
    } else if (title.includes('Heart Rate')) {
      return 75; // Typical resting heart rate
    } else if (title.includes('Glucose')) {
      return 90; // Typical fasting glucose
    } else if (title.includes('Weight')) {
      return 70; // Typical weight in kg
    } else {
      return 100; // Default value
    }
  }

  private drawEnhancedChart(ctx: CanvasRenderingContext2D, data: WeeklyProgression[], config: any): void {
    const width = 800;
    const height = 400;
    const padding = 80;
    const chartColor = config.color || '#3498db';

    // Clear canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Extract data points based on category and metric
    const values: number[] = [];
    const weeks: number[] = [];
    
    console.log(`Extracting data for ${config.title} (${config.category}.${config.metric}):`, {
      dataLength: data.length
    });
    
    data.forEach((week, index) => {
      let value: number | undefined;
      
      // Use the same extraction logic as WeeklyProgressionCharts
      value = this.getMetricDataFromWeek(week, config.category, config.metric);
      
      console.log(`Week ${week.week}: extracted value = ${value}`);
      
      // Accept any valid number, including 0 for some metrics
      if (typeof value === 'number' && !isNaN(value)) {
        values.push(value);
        weeks.push(week.week);
      } else {
        console.log(`Week ${week.week}: No valid value found`);
      }
    });
    
    console.log(`Final values for ${config.title}:`, values);
    console.log(`Final weeks:`, weeks);

    // Debug: Show all extracted values
    if (values.length > 0) {
      console.log(`Successfully extracted ${values.length} values:`, values);
      console.log(`Value range: ${Math.min(...values)} to ${Math.max(...values)}`);
    } else {
      console.log('No values extracted - chart will show "No data available"');
    }

    if (values.length === 0) {
      // Draw "No Data Available" message
      ctx.fillStyle = '#7f8c8d';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No data available for this metric', width / 2, height / 2);
      return;
    }

    console.log(`Chart values range check:`, {
      values,
      min: Math.min(...values),
      max: Math.max(...values),
      length: values.length
    });

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const actualRange = maxValue - minValue;
    
    // If values are very similar, create a small artificial range for better visualization
    const range = actualRange > 0 ? actualRange : Math.max(maxValue * 0.1, 1);
    const displayMinValue = actualRange > 0 ? minValue : minValue - range / 2;
    const displayMaxValue = actualRange > 0 ? maxValue : maxValue + range / 2;

    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, width / 2, 40);

    // Draw grid lines
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * (height - 2 * padding)) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= weeks.length - 1; i++) {
      const x = padding + (i * (width - 2 * padding)) / (weeks.length - 1);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // X-axis
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    // Y-axis
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();

    // Draw Y-axis labels
    ctx.fillStyle = '#2c3e50';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = displayMinValue + (range * i) / 5;
      const y = height - padding - (i * (height - 2 * padding)) / 5;
      ctx.fillText(value.toFixed(1), padding - 10, y + 5);
    }

    // Draw X-axis labels
    ctx.textAlign = 'center';
    weeks.forEach((week, index) => {
      const x = padding + (index * (width - 2 * padding)) / (weeks.length - 1);
      ctx.fillText(`Week ${week}`, x, height - padding + 25);
    });

    // Draw unit label
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '16px Arial';
    const metricName = config.metric?.replace(/_/g, ' ') || 'Value';
    ctx.fillText(`${metricName} (${config.unit})`, 0, 0);
    ctx.restore();

    // Draw data line and points
    if (values.length > 1) {
      ctx.strokeStyle = chartColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      values.forEach((value, index) => {
        const x = padding + (index * (width - 2 * padding)) / (values.length - 1);
        const y = height - padding - ((value - displayMinValue) / range) * (height - 2 * padding);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw data points
    ctx.fillStyle = chartColor;
    values.forEach((value, index) => {
      const x = padding + (index * (width - 2 * padding)) / (values.length - 1);
      const y = height - padding - ((value - displayMinValue) / range) * (height - 2 * padding);
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add value labels on points
      ctx.fillStyle = '#2c3e50';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(value.toFixed(1), x, y - 12);
      ctx.fillStyle = chartColor;
    });

    // Add trend indicator
    if (values.length > 1) {
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const trend = lastValue - firstValue;
      const trendText = trend > 0 ? `↗ +${trend.toFixed(1)}` : trend < 0 ? `↘ ${trend.toFixed(1)}` : '→ No Change';
      const trendColor = trend > 0 ? '#27ae60' : trend < 0 ? '#e74c3c' : '#95a5a6';
      
      ctx.fillStyle = trendColor;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`Trend: ${trendText}`, width - padding, padding + 20);
    }
  }

  private drawSimpleChart(ctx: CanvasRenderingContext2D, data: WeeklyProgression[], metric: string, title: string): void {
    const width = 800;
    const height = 400;
    const padding = 60;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);

    // Extract data points
    const values = data.map(week => week.parameters?.vitals?.[metric] || 0).filter(v => v > 0);
    if (values.length === 0) return;

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    // Draw axes
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();

    // Draw data points and lines
    ctx.strokeStyle = 'blue';
    ctx.fillStyle = 'blue';
    ctx.lineWidth = 3;
    
    const stepX = (width - 2 * padding) / (data.length - 1);
    
    ctx.beginPath();
    data.forEach((week, index) => {
      const value = week.parameters?.vitals?.[metric] || 0;
      if (value > 0) {
        const x = padding + index * stepX;
        const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw point
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    });
    ctx.stroke();

    // Add labels
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    data.forEach((week, index) => {
      const x = padding + index * stepX;
      ctx.fillText(`W${week.week}`, x, height - padding + 20);
    });
  }

  private addSectionHeader(text: string): void {
    this.checkPageSpace(30);
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(text, this.margin, this.currentY);
    this.currentY += 15;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
  }

  private addSubHeader(text: string): void {
    this.checkPageSpace(20);
    this.pdf.setFontSize(13);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(text, this.margin, this.currentY);
    this.currentY += 10;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
  }

  private addText(text: string): void {
    if (!text.trim()) {
      this.currentY += 5;
      return;
    }

    this.checkPageSpace(15);
    const lines = this.pdf.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    lines.forEach((line: string) => {
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += 6;
    });
    this.currentY += 3;
  }

  private addBulletPoint(text: string): void {
    this.checkPageSpace(15);
    const bulletText = `• ${text}`;
    const lines = this.pdf.splitTextToSize(bulletText, this.pageWidth - 2 * this.margin - 10);
    lines.forEach((line: string, index: number) => {
      this.pdf.text(line, this.margin + (index === 0 ? 0 : 10), this.currentY);
      this.currentY += 6;
    });
    this.currentY += 2;
  }

  private addTableHeader(headers: string[]): void {
    this.checkPageSpace(20);
    this.pdf.setFont('helvetica', 'bold');
    const colWidth = (this.pageWidth - 2 * this.margin) / headers.length;
    
    headers.forEach((header, index) => {
      this.pdf.text(header, this.margin + index * colWidth, this.currentY);
    });
    
    this.currentY += 8;
    this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 5;
    this.pdf.setFont('helvetica', 'normal');
  }

  private addTableRow(data: string[]): void {
    this.checkPageSpace(15);
    const colWidth = (this.pageWidth - 2 * this.margin) / data.length;
    
    data.forEach((cell, index) => {
      this.pdf.text(cell, this.margin + index * colWidth, this.currentY);
    });
    
    this.currentY += 8;
  }

  private calculateImprovement(baseline: number, final: number): number | null {
    if (typeof baseline !== 'number' || typeof final !== 'number') return null;
    return baseline - final;
  }

  private calculateChangeText(baseline: number, final: number): string {
    if (typeof baseline !== 'number' || typeof final !== 'number') return 'N/A';
    const change = final - baseline;
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}`;
  }

  private checkPageSpace(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.addNewPage();
    }
  }

  private addNewPage(): void {
    this.pdf.addPage();
    this.currentY = 20;
  }

  private addFooterToAllPages(): void {
    const totalPages = this.pdf.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(128, 128, 128);
      
      // Footer text
      this.pdf.text(
        'Generated by Digital Twin Health System',
        this.margin,
        this.pageHeight - 10
      );
      
      // Page number
      this.pdf.text(
        `Page ${i} of ${totalPages}`,
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      );
      
      this.pdf.setTextColor(0, 0, 0);
    }
  }

  downloadReport(filename: string = 'health-simulation-report.pdf'): void {
    this.pdf.save(filename);
  }

  getBlob(): Blob {
    return this.pdf.output('blob');
  }
}

export default ReportGenerator; 
import * as d3 from 'd3';

// Function to load and process CSV data
export const processCSVData = async (filePath: string) => {
  try {
    const csvData = await d3.csv(filePath, d => ({
      id: (d.Id + String(d.Line) + String(d.Ring)),
      patient: d.Id,
      wavelength: +d.Wavelength,
      intensity: +d.Intensity,
      line: d.Line,
      ring: d.Ring,
    }));
    // Group wavelengths per patient
    const groupedData = d3.group(csvData, d => d.id);
    const processedData = Array.from(groupedData, ([id, values], index) => ({
      id,
      patient: values[0].patient,
      line: Number(values[0].line),
      ring: Number(values[0].ring),
      series: values.map(v => ({ wavelength: v.wavelength, intensity: v.intensity})),
    }));

    return processedData;
  } catch (error) {
    console.error('Error loading CSV:', error);
    return []; // Return empty array on error
  }
};
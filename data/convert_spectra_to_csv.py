import os
import csv

def convert_spectra_to_csv(input_folder, output_file):
    # Open a CSV file to write the results
    with open(output_file, mode='w', newline='') as file:
        writer = csv.writer(file)

        # Write header
        writer.writerow(['Id', 'Wavelength', 'Intensity', 'Line', 'Ring'])

        # Read each file in the input folder
        for filename in os.listdir(input_folder):
            if filename.endswith(".txt"):
                filepath = os.path.join(input_folder, filename)
                
                file_id = os.path.splitext(filename)[0]
                file_id = file_id.split("_") # Temporarily reduce data
                    # Separate into variables
                with open(filepath, 'r') as file:
                            # Skip header
                            file.readline()
                            # Create variables to keep track for data aggregation
                            curWavelength = 793
                            count = 0
                            intensitySum = 0
                            # Write to file
                            for line in file:
                                wavelength, intensity = line.split(',')
                                intensity = intensity.strip().strip('"') # Remove quotations that randomly appear
                                if float(wavelength) < curWavelength:
                                    intensitySum += float(intensity)
                                    count += 1
                                else:
                                    writer.writerow([file_id[0], curWavelength, (intensitySum / count), file_id[1], file_id[2]])
                                    curWavelength += 1
                                    intensitySum = 0
                                    count = 0

    print(f"CSV file created at {output_file}")

# Use the function to process files in 'data/spectra'
convert_spectra_to_csv('spectra', 'combined_spectra_data.csv')
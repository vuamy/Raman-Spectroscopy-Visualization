import os
import csv

def convert_spectra_to_csv(input_folder, output_file):
    # Load the inventory_patient_data.csv file using csv package
    inventory_patient_data = {}
    with open('data/Inventory_Patient_ECS272.csv', mode='r') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            inventory_patient_data[int(row['Patient_OD'])] = row['Staging_Overall']

    # Open a CSV file to write the results
    with open(output_file, mode='w', newline='') as file:
        writer = csv.writer(file)

        # Write header
        writer.writerow(['Id', 'Wavelength', 'Intensity', 'Line', 'Ring', 'Cancer'])

        # Read each file in the input folder
        for filename in os.listdir(input_folder):
            if filename.endswith(".txt"):
                filepath = os.path.join(input_folder, filename)
                
                file_id = os.path.splitext(filename)[0]
                file_id = file_id.split("_") # Temporarily reduce data

                # fine the cancer status of the patient
                cancer_status = inventory_patient_data[int(file_id[0])]
                if cancer_status == 'Nan':
                    cancer = 0
                else:
                    cancer = 1
                
                    # Separate into variables
                with open(filepath, 'r') as file:
                            # Skip header
                            file.readline()
                            # Write to file
                            for line in file:
                                wavelength, intensity = line.split(',')
                                intensity = intensity.strip().strip('"') # Remove quotations that randomly appear
                                writer.writerow([file_id[0], wavelength.strip(), intensity, int(file_id[1]), int(file_id[2]), cancer])

    print(f"CSV file created at {output_file}")

# Use the function to process files in 'data/spectra'

convert_spectra_to_csv('data/downsized_spectra', 'data/combined_spectra_data.csv')

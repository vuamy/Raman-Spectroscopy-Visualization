# Raman-Spectroscopy-Visualization
Visualization tool to support research in raman spectroscopy intended to improve accuracy in early-stage cancer diagnosis.\
Developers **Amy Vu** and **Yifei Gu**

## Visual Tools
1. ***Sankey diagram*** to visualize spread of metadata across current patient sample.
2. ***Scatter Plot*** to visualize all patients based on stage, BMI, and age.
3. ***Wavelength series plot*** of intensity over varying wavelengths per patient and measurement sample location.
4. ***Heatmap*** indicating the spatial variance of a single patient

## Interactions
1. Hover over Sankey paths to view connected nodes and count.
2. Click on Sankey noddes to highlight connected paths.
3. Zoom in or out of Sankey plot to focus on smaller nodes and paths. Includes reset button.
4. Hover over data points in Scatter Plot to view all patient information.
5. Filter patients in Scatter Plot so that only those with spectra data is shown.
6. Click on patient in Scatter Plot to show their data in the Wavelength and Heatmap plot.
7. Hover over Wavelength plot to view exact wavelength and intensity values at that point.
8. Edit the range of Wavelength plot shown by dragging the slider.
9. Click on any point of Wavelength plot to display the heatmap of that patient's intensity variance of that wavelength value. Also allows for dragging to smoothly see the heatmap shift.
10. Gradient min and max values in Heatmap dynamically change based on patients min and max intensities.
11. Hover over any point in Heatmap to see the line, ring, and intensity values. Also updates the Wavelength plot so that only the associated spectra is displayed.

## Running Locally
Clone program and install all depencies by running these lines in your terminal:
```
git clone https://github.com/vuamy/Raman-Spectroscopy-Visualization.git
npm install
```
The CSV file containing all the spectra data we use to visualizate each patient's intensity over varying wavelength values is too large to include in this repository. Instead, we have a script that transforms all the .txt spectra data located inside data/spectra into a CSV file that will be saved in your local copy. Make sure to run this script before running the local server:
```
python data/convert_spectra_to_csv.py
```
Finally, begin the local development server.
```
npm run dev
```

## Contributors
Thanks to Professor Kwan-Liu Ma and Teaching Assistant Yun-Hsin Kuo in ECS 272: Information Visualization at University of California, Davis for providing teaching and feedback.

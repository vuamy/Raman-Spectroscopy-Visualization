# Raman-Spectroscopy-Visualization
Visualization tool to support research in raman spectroscopy intended to improve accuracy in early-stage cancer diagnosis.\
Developers **Amy Vu** and **Yifei Gu**

## Visual Tools
1. ***Sankey diagram*** to visualize spread of metadata across current patient sample.
2. ***Wavelength series plot*** of intensity over varying wavelengths per patient and measurement sample location.
3. ***Heatmap*** indicating the spatial variance of a single patient

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

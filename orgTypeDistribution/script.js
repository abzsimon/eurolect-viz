let isNormalized = false; // État de la normalisation (ON/OFF)

// Fonction pour basculer entre normalisé et absolu
function toggleNormalization() {
    isNormalized = !isNormalized; // Inverser l'état
    updateChart(); // Mettre à jour le graphique
}

// Fonction pour charger et afficher les données avec tri dynamique et option de normalisation
function updateChart() {
    fetch('./orgStats.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load orgStats.json");
        }
        return response.json();
      })
      .then((sortedData) => {
        const TESTER = document.getElementById("tester");
        const sortKey = document.getElementById("sort-key").value; // Récupérer la clé de tri choisie

        // 📌 Extraire les types d'activités uniques
        let activityTypes = [...new Set(
          sortedData.flatMap(org => Object.keys(org.activityStats))
        )];

        // 📌 S'assurer que PRC est toujours en premier (en bas des barres)
        const hasPRC = activityTypes.includes("PRC");
        activityTypes = activityTypes.filter(activity => activity !== "PRC"); // Enlever PRC de la liste
        if (hasPRC) activityTypes.unshift("PRC"); // Ajouter PRC en premier

        // 🧮 Calculer les valeurs de tri (PRC et Total Contribution)
        let projectValues = sortedData.map(org => ({
          projectID: org.projectID,
          prcValue: org.activityStats["PRC"] || 0, // Valeur PRC (mettre 0 si absent)
          totalContribution: Object.values(org.activityStats).reduce((sum, val) => sum + val, 0) || 1 // Total contribution
        }));

        // 🔄 Appliquer le tri en fonction de la clé sélectionnée
        projectValues.sort((a, b) => {
          if (sortKey === "PRC") return a.prcValue - b.prcValue;
          if (sortKey === "total") return a.totalContribution - b.totalContribution;
          return 0;
        });

        // 🏷️ Récupérer les IDs triés
        const sortedProjectIDs = projectValues.map(proj => proj.projectID);

        // 📊 Construire les traces pour Plotly (avec ou sans normalisation)
        let traces = activityTypes.map(activity => ({
          x: sortedProjectIDs.map(String),
          y: sortedProjectIDs.map(projID => {
            let org = sortedData.find(o => o.projectID === projID);
            let total = projectValues.find(p => p.projectID === projID).totalContribution;
            return isNormalized ? ((org.activityStats[activity] || 0) / total) * 100 : (org.activityStats[activity] || 0);
          }),
          name: activity,
          type: "bar",
          marker: { color: activity === "PRC" ? "black" : undefined } // Optionnel : Mettre PRC en rouge
        }));

        // 🎨 Configuration du graphique
        let layout = {
          title: `Graphique ${isNormalized ? "Normalisé" : "Absolu"} - Trié par ${sortKey}`,
          xaxis: { title: "ID du Projet", type: "category" },
          yaxis: { title: isNormalized ? "Contribution (%)" : "Contribution (€)", range: isNormalized ? [0, 100] : undefined, tickformat: isNormalized ? ".0%" : ",.0f" },
          barmode: "stack" // Mode empilé
        };

        // 🚀 Affichage avec Plotly
        Plotly.newPlot(TESTER, traces, layout);
      })
      .catch((error) => {
        console.error("Error loading or parsing orgStats.json:", error);
      });
}

// Charger le graphique au démarrage avec le tri par défaut (PRC)
updateChart();

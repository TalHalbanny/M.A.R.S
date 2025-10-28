    async function loadTopIssues() {
        
      try {
        const res = await fetch('/top-issues');
        const data = await res.json();

        const renderList = (id, list) => {
          const container = document.getElementById(id);
          container.innerHTML = '';
          if (!list.length) {
            container.innerHTML = '<li class="list-group-item text-center text-muted">No issues yet 🎉</li>';
            return;
          }
          list.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `
              <span>${item._id}</span>
              <span class="count-badge">${item.totalIssues}</span>
            `;
            container.appendChild(li);
          });
        };

        renderList('shuttleList', data.Shuttle || []);
        renderList('agvList', data.AGV || []);
        renderList('rgvList', data.RGV || []);
        renderList('liftList', data.Lift || []);

      } catch (err) {
        console.error('Error loading top issues:', err);
      }
    }

    loadTopIssues();
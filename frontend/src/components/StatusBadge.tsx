import React from 'react';

// Correspondance statut → label français + classe CSS
const statusMap: Record<string, { label: string; cls: string }> = {
  available: { label: 'Disponible',  cls: 'badge-available' },
  on_loan:   { label: 'En prêt',     cls: 'badge-on_loan'   },
  sold:      { label: 'Vendu',       cls: 'badge-sold'      },
  returned:  { label: 'Retourné',    cls: 'badge-returned'  },
  planned:   { label: 'Planifiée',   cls: 'badge-planned'   },
  ongoing:   { label: 'En cours',    cls: 'badge-ongoing'   },
  closed:    { label: 'Clôturée',    cls: 'badge-closed'    },
};

interface StatusBadgeProps {
  status: string;
  dataCy?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, dataCy }) => {
  const info = statusMap[status] ?? { label: status, cls: '' };
  return (
    <span className={`badge ${info.cls}`} data-cy={dataCy}>
      {info.label}
    </span>
  );
};

export default StatusBadge;

import React from 'react';
import './StructuredResponse.css';

const StructuredResponse = ({ data }) => {
  if (!data || !data.type) {
    return null;
  }

  const renderContent = () => {
    switch (data.type) {
      case 'table':
        return (
          <table className="response-table">
            <thead>
              <tr>
                {data.headers.map((header, index) => <th key={index}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        );
      // Add cases for other types like 'list', 'chart', etc. later
      default:
        return <pre>{JSON.stringify(data, null, 2)}</pre>;
    }
  };

  return <div className="structured-response-container">{renderContent()}</div>;
};

export default StructuredResponse;

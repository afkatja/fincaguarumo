import React from "react"
import { PreviewProps } from "sanity"

interface ColumnsBlockPreviewProps extends PreviewProps {
  columnCount: string
}

const ColumnsBlockPreview: React.FC<ColumnsBlockPreviewProps> = ({
  columnCount,
}) => {
  const columnStyles = {
    display: "flex",
    gap: "8px",
    height: "24px",
  }

  const columnStyle = {
    flex: 1,
    backgroundColor: "#ccc",
    borderRadius: "2px",
  }

  return (
    <div style={columnStyles}>
      {Array.from({ length: parseInt(columnCount) }).map((_, index) => (
        <div key={index} style={columnStyle} />
      ))}
    </div>
  )
}

export default ColumnsBlockPreview

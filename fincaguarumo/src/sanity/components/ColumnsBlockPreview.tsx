import React from "react"
import { PreviewProps } from "sanity"

interface ColumnsBlockPreviewProps extends PreviewProps {
  columnCount?: string
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

  // Defensive handling: default to 2 columns if columnCount is undefined or invalid
  const parsedColumnCount = parseInt(columnCount || "2", 10)
  const validColumnCount = isNaN(parsedColumnCount) ? 2 : parsedColumnCount

  return (
    <div style={columnStyles}>
      {Array.from({ length: validColumnCount }).map((_, index) => (
        <div key={index} style={columnStyle} />
      ))}
    </div>
  )
}

export default ColumnsBlockPreview

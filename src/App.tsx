import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import './App.css';
import { AiFillEdit } from 'react-icons/ai'
import { Modal } from 'antd';
import Pagination from './component/pagination';

type SelectColumn = {
  key: string,
  value: string
}

function App() {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [header, setHeader] = useState<string[]>([]);
  const [editedData, setEditedData] = useState<any[]>([]);
  const [switchState, setSwitchState] = useState<boolean[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<SelectColumn[]>([]);
  const [modalRowIndex, setModalRowIndex] = useState<number>(0);
  const [modalCellIndex, setModalCellIndex] = useState<number>(0);
  const [modalInputValue, setModalInputValue] = useState<string>('');
  const [hiddenRows, setHiddenRows] = useState<boolean[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, _] = useState(22);

  const offset = currentPage * itemsPerPage;

  const keySelectOption = ['string', 'boolean', 'number', 'comment', 'literal', 'escape_string']
  useEffect(() => {
    if (Array.isArray(header) && header.length > 0) {
      const result = header.map((key) => ({
        key: key,
        value: 'enable'
      }))
      setSelectedColumns(result);
    }
  }, [header]);

  const handleHideToggle = (rowIndex: number) => {
    const updatedHiddenRows = [...hiddenRows];
    updatedHiddenRows[rowIndex] = !updatedHiddenRows[rowIndex];
    setHiddenRows(updatedHiddenRows);
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        const csvText = reader.result as string;
        Papa.parse(csvText, {
          complete: (results) => {
            const switchStateArray = Array.from(
              { length: results.data.length - 1 },
              () => false
            );
            setCsvData(
              results.data.slice(1).map((row: any, rowIndex: number) => {
                if (row.includes("comment")) {
                  return [...row, switchStateArray[rowIndex]];
                } else {
                  return row;
                }
              })
            );
            setHeader(results.data[0] as string[]);
            setEditedData(results.data.slice(1));
            setSwitchState(switchStateArray);
          },
        });
      };
      reader.readAsText(file);
    }
  };

  const handleSwitchChange = (rowIndex: number) => {
    const updatedSwitchState = [...switchState];
    updatedSwitchState[rowIndex] = !updatedSwitchState[rowIndex];
    setSwitchState(updatedSwitchState);
  
    const updatedEditedData = [...editedData];
    const commentIndex = updatedEditedData[rowIndex].findIndex((cell: any) => cell.includes("comment")) + 1;
    if (commentIndex !== -1) {
      const comment = updatedEditedData[rowIndex][commentIndex];
      if (updatedSwitchState[rowIndex]) {
        updatedEditedData[rowIndex][commentIndex] = `${comment} [ADD]`;
      } else {
        updatedEditedData[rowIndex][commentIndex] = comment.replace(" [ADD]", "");
      }
      setEditedData(updatedEditedData);
    }
  };
  

const handleCellEdit = (
  newValue: string,
  rowIndex: number,
  cellIndex: number
) => {
  const updatedData = [...editedData];
  const actualRowIndex = offset + rowIndex;
  updatedData[actualRowIndex][cellIndex] = newValue;
  setEditedData(updatedData);
};


  const handleModalOpen = (rowIndex: number, cellIndex: number) => {
    const actualRowIndex = offset + rowIndex;
    const cellValue = editedData[actualRowIndex][cellIndex];
    setModalInputValue(cellValue);
    setModalRowIndex(actualRowIndex);
    setModalCellIndex(cellIndex);
    setModalVisible(true);
  };
  
  const handleModalClose = () => {
    setModalVisible(false);
  };

  const handleModalSave = (newValue: string) => {
    const updatedData = [...editedData];
    updatedData[modalRowIndex][modalCellIndex] = newValue;
    setEditedData(updatedData);
    setModalVisible(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const { selectionStart, value } = textarea;
      const lines = value.split('\n');
      const currentLineIndex = lines.findIndex((line) => selectionStart! >= line.length);
      const currentLine: any = lines[currentLineIndex] ?? '';
      const indentation = currentLine.match(/^\s*/)[0];
      const newLine = indentation + value.slice(selectionStart!);
      const newValue = value.slice(0, selectionStart!) + '\n' + newLine;
      setModalInputValue(newValue);

      setTimeout(() => {
        textarea.selectionStart = selectionStart! + indentation.length + 1;
        textarea.selectionEnd = selectionStart! + indentation.length + 1;
        textarea.focus();
      }, 0);
    }
  };

  const handleUpdateSelectColumn = (columnName: string) => {
    setSelectedColumns((prevSelectedColumns) =>
      prevSelectedColumns.map((item) => {
        if (item.key === columnName) {
          if (item.value === 'enable') {
            return { ...item, value: 'disable' }
          }
          if (item.value === 'disable') {
            return { ...item, value: 'enable' }
          }
        }
        return item
      })
    )
  };

  const handleRestoreAllColumns = () => {
    const result = header.map((key) => ({
      key: key,
      value: 'enable'
    }))
    setSelectedColumns(result);
  };


  const handleExportCSV = () => {
    const filteredData = editedData.map((row) =>
      row.map((value: any, index: number) => {
        const result = selectedColumns[index].value === 'enable' && value !== "" ? value : null
        return result;
      }
      )
    );

    const selectedHeader = header.filter((column: any) =>
      selectedColumns.includes(column)
    );
    const selectedData = filteredData.filter((row) =>
      row.some((cell: any) => cell !== "")
    );
    const newData = [selectedHeader, ...selectedData];
    const removeHeader = newData.slice(1);
    removeHeader.unshift(header)
    const csvString = Papa.unparse(removeHeader, { quotes: true });

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "edited.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportYAML = () => {
    const yamlText: string[] = [];
    yamlText.push("# THIS IS AN AUTO GENERATED FILE. Do not modify it directly.");
    editedData.forEach((column) => {
      const columnValues: { [key: string]: string } = {};

      column.forEach((value: string, index: number) => {
        const columnName = header[index];
        columnValues[columnName] = value;
      });

      const { key, common, develop, staging, devRemote } = columnValues;

      if (key && key.startsWith("#")) {
        const comments = key.split('\n');
        comments.forEach((comment: string) => {
          yamlText.push(comment);
        });
      } else if (key && (key.startsWith('app.') || key.startsWith('platform.'))) {
        const value = formatValue(common) || formatValue(develop) || formatValue(staging) || formatValue(devRemote);
        if (value) {
          yamlText.push(`${key}: ${value}`);
        }
      } else {
        const value = common || develop || staging || devRemote;
        if (value) {
          yamlText.push(`${key}: ${value}`);
        }
      }
    });

    const yamlContent = yamlText.join('\n');
    const yamlBlob = new Blob([yamlContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(yamlBlob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'edited.yaml');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatValue = (value: string | undefined): string | undefined => {
    if (value && value.includes('\n')) {
      return value;
    }
    return value ? value.trim() : undefined;
  };


  const handlePageChange = (selectedPage: number) => {
    setCurrentPage(selectedPage);
  };

  const pagedItems = useMemo(() => {
    const startIndex = offset;
    const endIndex = offset + itemsPerPage;
    return editedData.slice(startIndex, endIndex);
  }, [offset, itemsPerPage, editedData]);

  console.log(pagedItems)

  return (
    <div className="container">
      <div className="main">
        <div className='header-action'>
          <div className='frame-input-file'>
            <input className='open-file' id='select-file' type="file" accept=".csv" onChange={handleFileUpload} />
          </div>
          <button className="button" onClick={handleExportYAML}>
            Export YAML
          </button>

          <button className='button' onClick={handleExportCSV}>Export CSV</button>
          <button className='button' onClick={handleRestoreAllColumns}>Restore all columns </button>
          <Pagination
              pageCount={Math.ceil(editedData.length / itemsPerPage)}
              onPageChange={handlePageChange}
              initialPage={currentPage}
            />
        </div>
        {Array.isArray(header) &&
          <div className='frame-header-row header-select' style={{ gridTemplateColumns: `repeat(${selectedColumns.length}, minmax(0, 1fr))` }}>
            {selectedColumns.map((cell: SelectColumn, cellIndex: any) => (
              <div className={cell.value === 'disable' ? 'item-header-row disable' : 'item-header-row'} key={cellIndex}>
                <button className='button' onClick={() => handleUpdateSelectColumn(cell.key)}>
                  {cell.key.charAt(0).toUpperCase() + cell.key.slice(1)}
                </button>
              </div>
            ))}
          </div>
        }
        {Array.isArray(header) && header.length > 0 &&
          <div className='frame-header-row' style={{ gridTemplateColumns: `repeat(${header.length}, minmax(0, 1fr))` }}>
            {header.slice(1).map((cell: any, cellIndex: any) => (
              <div className='item-header-row' key={cellIndex}>
                <button className='button'>
                  {cell.charAt(0).toUpperCase() + cell.slice(1)}
                </button>
              </div>
            ))}
            <div className='item-header-row'>
              Add comment
            </div>
          </div>
        }
        <table className='frame-table'>
          <tbody className='tbody'>
            {Array.isArray(pagedItems) && pagedItems.length > 1
              &&
              pagedItems.map((row: any[], rowIndex: any) => {
                return (
                  <tr key={rowIndex} className={`item-content-row ${hiddenRows[rowIndex] ? 'hidden-row' : ''}`}
                    style={{
                      gridTemplateColumns: `repeat(${header.length}, minmax(0, 1fr))`,
                      gridTemplateRows: hiddenRows[rowIndex] ? '' : `repeat(2, 1fr)`,
                      gap: '1rem',
                    }}>
                    {
                      row.map((cell: any, cellIndex: any) => {
                        const keyIndex = header.indexOf('key') - 1;
                        return (
                          cellIndex === 0
                            ? <div className='title'
                              style={{
                                gridRow: '1',
                                gridColumn: `span ${header.length} / span ${header.length}`
                              }} onClick={() => handleHideToggle(rowIndex)}>{cell}</div>
                            : <td style={{
                              gridRow: '2',
                              backgroundColor: rowIndex % 2 === 0 ? '#161616' : '#363535',
                              display: hiddenRows[rowIndex] ? 'none' : ''
                            }} key={`${rowIndex}-${cellIndex}`} className='item-content'>
                              {keyIndex === cellIndex
                                ? <select
                                  className='select-key'
                                  style={{
                                    backgroundColor: rowIndex % 2 === 0 ? "#161616" : "#363535",
                                  }}
                                  value={pagedItems[rowIndex][cellIndex]}
                                  onChange={(event) => handleCellEdit(event.target.value, rowIndex, cellIndex)}
                                >
                                  {keySelectOption.map((option: string) => (
                                    <option className='option-keys' key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                :
                                <>
                                  <input
                                    style={{
                                      backgroundColor: rowIndex % 2 === 0 ? '#161616' : '#363535'
                                    }}
                                    type="text"
                                    value={pagedItems[rowIndex][cellIndex]}
                                    onChange={(event) => handleCellEdit(event.target.value, rowIndex, cellIndex)}
                                  />
                                  <button className='button-edit-field' onClick={() => handleModalOpen(rowIndex, cellIndex)}>
                                    <AiFillEdit />
                                  </button>
                                </>
                              }
                            </td>
                        );
                      })
                    }
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
      <Modal
        visible={modalVisible}
        onCancel={handleModalClose}
        onOk={() => handleModalSave(modalInputValue)}
        className='edit-modal'
      >
        <label>
          Edit data
        </label>
        <textarea
          key='textarea-field'
          value={modalInputValue}
          onChange={(event) => setModalInputValue(event.target.value)}
          rows={20}
          onKeyDown={handleKeyDown}
        />
      </Modal>
    </div>
  );
}

export default App;

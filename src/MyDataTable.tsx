import React, { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import axios from "axios";
import "primeicons/primeicons.css";

interface DataItem {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

const MyDataTable: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [selectedRows, setSelectedRows] = useState<DataItem[]>([]);
  const [globalSelection, setGlobalSelection] = useState<DataItem[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage] = useState<number>(10);
  const [selectionLimit, setSelectionLimit] = useState<number>(5);
  const op = useRef<OverlayPanel>(null);

  useEffect(() => {
    fetchPageData(page);
  }, [page]);

  const fetchPageData = async (page: number) => {
    try {
      const response = await axios.get(
        `https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rowsPerPage}`
      );
      setData(response.data.data);
      setTotalRecords(response.data.pagination.total);
      updateSelectedRowsForPage(response.data.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const onPageChange = (event: { first: number; rows: number }) => {
    const newPage = Math.floor(event.first / event.rows) + 1;
    setPage(newPage);
  };

  const rowSelectionChange = (e: { value: DataItem[] }) => {
    const newSelections = e.value;
    const updatedGlobalSelection = mergeSelections(newSelections);

    setGlobalSelection(updatedGlobalSelection);
    setSelectedRows(newSelections);
  };

  const mergeSelections = (newSelections: DataItem[]): DataItem[] => {
    const allSelections = [...globalSelection, ...newSelections];
    const uniqueSelections = Array.from(
      new Set(allSelections.map((item: DataItem) => item.id))
    ).map(
      (id) => allSelections.find((item: DataItem) => item.id === id) as DataItem
    );
    return uniqueSelections;
  };

  const updateSelectedRowsForPage = (currentPageData: DataItem[]) => {
    const selectedOnPage = currentPageData.filter((item: DataItem) =>
      globalSelection.some((selected: DataItem) => selected.id === item.id)
    );
    setSelectedRows(selectedOnPage);
  };

  const selectRowsAcrossPages = async () => {
    let allSelections: DataItem[] = [];
    let currentPage = 1;

    while (
      allSelections.length < selectionLimit &&
      currentPage <= Math.ceil(totalRecords / rowsPerPage)
    ) {
      try {
        const response = await axios.get(
          `https://api.artic.edu/api/v1/artworks?page=${currentPage}&limit=${rowsPerPage}`
        );
        const newData = response.data.data;

        const nonDuplicateSelections = newData.filter(
          (item: DataItem) =>
            !allSelections.some((selected: DataItem) => selected.id === item.id)
        );

        allSelections = [...allSelections, ...nonDuplicateSelections].slice(
          0,
          selectionLimit
        );
        currentPage++;
      } catch (error) {
        console.error("Error fetching data:", error);
        break;
      }
    }

    setGlobalSelection(allSelections);
    updateSelectedRowsForPage(data);
    op.current?.hide();
  };

  const deselectAllRows = () => {
    setGlobalSelection([]);
    setSelectedRows([]);
  };

  const RowSelectionPanel = () => (
    <div>
      <Button
        type="button"
        icon="pi pi-chevron-down"
        label={`Select Rows (${selectionLimit})`}
        onClick={(e) => op.current?.toggle(e)}
        className="p-button-text"
      />
      <OverlayPanel ref={op} dismissable>
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <label>
              Select number of rows:
              <input
                type="number"
                value={selectionLimit}
                onChange={(e) => setSelectionLimit(Number(e.target.value))}
                min={1}
                max={totalRecords}
                style={{ marginLeft: "1rem" }}
              />
            </label>
          </div>
          <Button
            label="Submit"
            icon="pi pi-check"
            onClick={selectRowsAcrossPages}
          />
          <Button
            label="Deselect All"
            icon="pi pi-times"
            onClick={deselectAllRows}
            className="p-button-danger"
            style={{ marginLeft: "1rem" }}
          />
        </div>
      </OverlayPanel>
    </div>
  );

  return (
    <div>
      <DataTable
        value={data}
        selection={selectedRows}
        onSelectionChange={rowSelectionChange}
        dataKey="id"
        paginator
        rows={rowsPerPage}
        totalRecords={totalRecords}
        lazy
        onPage={onPageChange}
        header={RowSelectionPanel}
        selectionMode="multiple"
        first={(page - 1) * rowsPerPage}
      >
        <Column selectionMode="multiple" />
        <Column field="id" header="ID" />
        <Column field="title" header="Title" />
        <Column field="place_of_origin" header="Place of Origin" />
        <Column field="artist_display" header="Artist Display" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Date Start" />
        <Column field="date_end" header="Date End" />
      </DataTable>
    </div>
  );
};

export default MyDataTable;

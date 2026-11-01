import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import React, { useState } from 'react';
import ReactPaginate from 'react-paginate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import _ from 'lodash';
export default function CustomPagination(props) {
  const [jumpToPage, setJumpToPage] = useState(1);
  const {
    currentPage = 1,
    onPageChange,
    totalItems = 0,
    limit = 10,
    onChangeLimit,
  } = props;
  const pageCount = Math.ceil(totalItems / limit);

  const handlePageSizeWithDebounce = _.debounce((value) => {
    const page = {
      selected: value - 1,
    };
    // setJumpToPage(value);
    onPageChange(page);
  }, 1000);

  const onChange = (e) => {
    const value = e.target.value;
    if (value) {
      setJumpToPage(value);
      handlePageSizeWithDebounce(value);
    } else {
      setJumpToPage('');
    }
  };

  return (
    <div className="flex justify-between items-center  rounded-md my-4   p-4 bg-white ">
      <div className="flex items-center gap-2">
        {' '}
        <Select value={limit} onValueChange={onChangeLimit}>
          <SelectTrigger id="clientType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 30, 40, 50].map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>{' '}
        <span className="text-xs text-nowrap">
          Showing {currentPage} of {pageCount} pages
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ReactPaginate
          pageCount={pageCount || 1}
          activeClassName="bg-primary text-light w-full h-full py-1 border border-primary rounded-md hover:bg-primary"
          forcePage={currentPage !== 0 ? currentPage - 1 : 0}
          onPageChange={(page) => onPageChange(page)}
          pageClassName={'  '}
          nextLinkClassName={'page-link'}
          nextClassName={
            'px-2 py-1.5 justify-self-center text-center  hover:bg-secondary cursor-pointer rounded-md font-medium border'
          }
          previousClassName={
            'px-2 py-1.5 justify-self-center text-center  hover:bg-secondary cursor-pointer rounded-md font-medium border'
          }
          previousLinkClassName={'page-link'}
          pageLinkClassName={
            'px-3 justify-self-center text-center py-1.5  hover:bg-secondary cursor-pointer rounded-md font-bold hover:text-dark w-full h-full'
          }
          containerClassName={'flex justify-end my-2  gap-1  items-center'}
          previousLabel={<IconChevronLeft className="size-4" />}
          nextLabel={<IconChevronRight className="size-4" />}
        />
        <div className="flex items-center gap-2">
          <span>Jump to:</span>
          <Input
            type="number"
            onChange={onChange}
            min={1}
            value={jumpToPage}
            className="w-16"
          />
        </div>
      </div>
    </div>
  );
}

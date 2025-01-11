import React from 'react';
import {
  Card,
  DataTable,
  Pagination,
  Select,
  TextField,
  Button,
  Badge,
  Link,
  Box,
} from '@shopify/polaris';
import { ContentGeneration } from './types';

const MOCK_GENERATIONS: ContentGeneration[] = Array.from({ length: 20 }, (_, i) => ({
  id: `gen-${i}`,
  date: new Date(2024, 2, Math.floor(Math.random() * 30) + 1).toISOString(),
  type: ['Product Description', 'Blog Post', 'Social Media', 'Email', 'Ad Copy'][
    Math.floor(Math.random() * 5)
  ] as ContentGeneration['type'],
  status: ['Completed', 'Failed', 'Processing'][
    Math.floor(Math.random() * 3)
  ] as ContentGeneration['status'],
  credits: Math.floor(Math.random() * 50) + 10,
  content: 'Sample generated content...',
  metadata: {
    wordCount: Math.floor(Math.random() * 500) + 100,
    language: 'English',
    tone: ['Professional', 'Casual', 'Friendly'][Math.floor(Math.random() * 3)],
  },
}));

export default function UsageHistory() {
  const [selectedGenerations, setSelectedGenerations] = React.useState<string[]>([]);
  const [searchValue, setSearchValue] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [typeFilter, setTypeFilter] = React.useState('all');

  const handleGenerationSelect = (id: string) => {
    setSelectedGenerations(prev => 
      prev.includes(id) 
        ? prev.filter(genId => genId !== id)
        : [...prev, id]
    );
  };

  const getStatusBadge = (status: ContentGeneration['status']) => {
    const variantMap = {
      Completed: 'success',
      Failed: 'critical',
      Processing: 'attention',
    };

    return <Badge status={variantMap[status]}>{status}</Badge>;
  };

  const rows = MOCK_GENERATIONS.map(generation => [
    <Link key={generation.id} onClick={() => console.log('View generation', generation.id)}>
      {new Date(generation.date).toLocaleDateString()}
    </Link>,
    generation.type,
    getStatusBadge(generation.status),
    generation.credits,
    generation.metadata.wordCount,
    <Button plain onClick={() => console.log('Download', generation.id)}>
      Download
    </Button>,
  ]);

  return (
    <Card>
      <Box title="Recent Generations">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <TextField
              label="Search generations"
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Search by type or content..."
              clearButton
              onClearButtonClick={() => setSearchValue('')}
            />
          </div>
          <div style={{ width: '200px' }}>
            <Select
              label="Filter by type"
              options={[
                { label: 'All types', value: 'all' },
                { label: 'Product Descriptions', value: 'product' },
                { label: 'Blog Posts', value: 'blog' },
                { label: 'Social Media', value: 'social' },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
        </div>

        <DataTable
          columnContentTypes={['text', 'text', 'text', 'numeric', 'numeric', 'text']}
          headings={['Date', 'Type', 'Status', 'Credits', 'Words', 'Actions']}
          rows={rows}
          selectable
          selectedItems={selectedGenerations}
          onSelectionChange={handleGenerationSelect}
        />

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Pagination
            hasPrevious
            onPrevious={() => setCurrentPage(prev => prev - 1)}
            hasNext
            onNext={() => setCurrentPage(prev => prev + 1)}
          />
        </div>
      </Box>
    </Card>
  );
}
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  ActivityIndicator,
  TextInput,
  TouchableOpacity
} from 'react-native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import CasosScreen from './CasosScreen';
import EvidenciasScreen from './EvidenciasScreen';
import RelatorioScreen from './RelatorioScreen';
import CadastroScreen from './CadastroScreen';

const Tab = createBottomTabNavigator();
const screenWidth = Dimensions.get('window').width - 32;

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [casosStatus, setCasosStatus] = useState([0, 0, 0]);
  const [casosPorDia, setCasosPorDia] = useState({});
  const [usuariosTipo, setUsuariosTipo] = useState([0, 0, 0]);
  const [totalCasos, setTotalCasos] = useState(0);
  const [totalEvidencias, setTotalEvidencias] = useState(0);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFim, setShowDatePickerFim] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: -14.2350,
    longitude: -51.9253,
    latitudeDelta: 15,
    longitudeDelta: 15,
  });
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = await AsyncStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // Carrega casos
      const casosRes = await axios.get('https://odontoforense-backend.onrender.com/api/casos?limit=1000', config);
      const casos = casosRes.data.data.docs || casosRes.data.data;
      filtrarDados(casos);

      // Carrega evidências
      const evidenciasRes = await axios.get('https://odontoforense-backend.onrender.com/api/evidencias?limit=1000', config);
      const evidencias = evidenciasRes.data.data.docs || evidenciasRes.data.data;
      setTotalEvidencias(evidencias.length);

      // Carrega usuários
      const userRes = await axios.get('https://odontoforense-backend.onrender.com/api/usuarios', config);
      const usuarios = userRes.data.data || userRes.data;
      setTotalUsuarios(usuarios.length);

      const tipos = { assistente: 0, perito: 0, administrador: 0 };
      usuarios.forEach(u => {
        const tipo = u.tipo?.toLowerCase();
        if (tipos[tipo] !== undefined) tipos[tipo]++;
      });

      setUsuariosTipo([tipos.assistente, tipos.perito, tipos.administrador]);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error.message);
    }

    setLoading(false);
  };

  const filtrarDados = (casos) => {
    let casosFiltrados = [...casos];
    
    if (dataInicio || dataFim) {
      const inicio = dataInicio ? new Date(dataInicio) : null;
      const fim = dataFim ? new Date(dataFim) : null;
      if (fim) fim.setHours(23, 59, 59, 999);

      casosFiltrados = casos.filter(caso => {
        const data = new Date(caso.dataOcorrido);
        return (!inicio || data >= inicio) && (!fim || data <= fim);
      });
    }

    setTotalCasos(casosFiltrados.length);

    const status = { Aberto: 0, 'Em andamento': 0, Fechado: 0 };
    const porDia = {};
    const novosMarkers = [];

    casosFiltrados.forEach(caso => {
      const stat = caso.status?.toLowerCase();
      if (stat === 'aberto') status.Aberto++;
      else if (stat === 'em andamento') status['Em andamento']++;
      else if (stat === 'fechado') status.Fechado++;

      const data = new Date(caso.dataOcorrido);
      const label = `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`;
      porDia[label] = (porDia[label] || 0) + 1;

      // Simulação de geolocalização - na prática você precisaria de uma API de geocoding
      if (caso.local) {
        novosMarkers.push({
          id: caso._id,
          latitude: -14.2350 + (Math.random() * 10 - 5),
          longitude: -51.9253 + (Math.random() * 10 - 5),
          title: caso.titulo,
          description: `${caso.local} - ${caso.status}`
        });
      }
    });

    setCasosStatus([status.Aberto, status['Em andamento'], status.Fechado]);
    setCasosPorDia(porDia);
    setMarkers(novosMarkers);
  };

  const handleFiltrar = () => {
    setLoading(true);
    fetchData();
  };

  const onDateChange = (event, selectedDate, type) => {
    if (type === 'inicio') {
      setShowDatePickerInicio(false);
      if (selectedDate) {
        setDataInicio(selectedDate.toISOString().split('T')[0]);
      }
    } else {
      setShowDatePickerFim(false);
      if (selectedDate) {
        setDataFim(selectedDate.toISOString().split('T')[0]);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#153777" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  // Ordenar e agrupar dados por dia para o gráfico de linha
  const sortedDays = Object.keys(casosPorDia).sort((a, b) => {
    const [dayA, monthA] = a.split('/').map(Number);
    const [dayB, monthB] = b.split('/').map(Number);
    return monthA - monthB || dayA - dayB;
  });

  // Agrupar por semanas para melhor visualização
  const groupedDays = [];
  const groupSize = Math.max(1, Math.ceil(sortedDays.length / 7));
  
  for (let i = 0; i < sortedDays.length; i += groupSize) {
    const group = sortedDays.slice(i, i + groupSize);
    const label = group.length > 1 ? `${group[0]} - ${group[group.length-1]}` : group[0];
    const total = group.reduce((sum, day) => sum + casosPorDia[day], 0);
    groupedDays.push({ label, total });
  }

  const lineChartData = {
    labels: groupedDays.map(item => item.label),
    datasets: [{
      data: groupedDays.map(item => item.total),
      color: (opacity = 1) => `rgba(13, 110, 253, ${opacity})`,
      strokeWidth: 2
    }]
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      
      {/* Filtro de datas melhorado */}
      <View style={styles.filterContainer}>
        <Text style={styles.sectionTitle}>Filtrar por Período</Text>
        <View style={styles.filterRow}>
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateLabel}>Data Início</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePickerInicio(true)}
            >
              <Text style={styles.dateInputText}>
                {dataInicio || 'Selecione a data'}
              </Text>
              <Ionicons name="calendar" size={20} color="#6c757d" />
            </TouchableOpacity>
          </View>

          <View style={styles.dateInputContainer}>
            <Text style={styles.dateLabel}>Data Fim</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePickerFim(true)}
            >
              <Text style={styles.dateInputText}>
                {dataFim || 'Selecione a data'}
              </Text>
              <Ionicons name="calendar" size={20} color="#6c757d" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.filterButton} 
            onPress={handleFiltrar}
          >
            <Ionicons name="filter" size={18} color="white" />
            <Text style={styles.filterButtonText}>Filtrar</Text>
          </TouchableOpacity>
        </View>

        {showDatePickerInicio && (
          <DateTimePicker
            value={dataInicio ? new Date(dataInicio) : new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => onDateChange(event, date, 'inicio')}
          />
        )}

        {showDatePickerFim && (
          <DateTimePicker
            value={dataFim ? new Date(dataFim) : new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => onDateChange(event, date, 'fim')}
          />
        )}
      </View>

      {/* Cards de Resumo - Estilo similar à versão web */}
      <Text style={styles.sectionTitle}>Resumo Geral</Text>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#ffc107' }]}>
          <View style={styles.summaryCardContent}>
            <Ionicons name="folder" size={28} color="#ffc107" />
            <Text style={styles.summaryLabel}>Casos</Text>
            <Text style={styles.summaryValue}>{totalCasos}</Text>
          </View>
        </View>
        
        <View style={[styles.summaryCard, { borderLeftColor: '#198754' }]}>
          <View style={styles.summaryCardContent}>
            <Ionicons name="search" size={28} color="#198754" />
            <Text style={styles.summaryLabel}>Evidências</Text>
            <Text style={styles.summaryValue}>{totalEvidencias}</Text>
          </View>
        </View>
        
        <View style={[styles.summaryCard, { borderLeftColor: '#0d6efd' }]}>
          <View style={styles.summaryCardContent}>
            <Ionicons name="people" size={28} color="#0d6efd" />
            <Text style={styles.summaryLabel}>Usuários</Text>
            <Text style={styles.summaryValue}>{totalUsuarios}</Text>
          </View>
        </View>
      </View>

      {/* Gráficos em linha como na versão web */}
      <Text style={styles.sectionTitle}>Análise de Casos</Text>
      
      {/* Gráfico de Status dos Casos */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="pie-chart" size={20} color="white" />
          <Text style={styles.chartHeaderText}>Status dos Casos</Text>
        </View>
        <View style={styles.chartContainer}>
          <PieChart
            data={[
              { name: 'Aberto', population: casosStatus[0], color: '#198754' },
              { name: 'Em andamento', population: casosStatus[1], color: '#fd7e14' },
              { name: 'Fechado', population: casosStatus[2], color: '#dc3545' }
            ]}
            width={screenWidth}
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
            hasLegend={false}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#198754' }]} />
              <Text style={styles.legendText}>Aberto: {casosStatus[0]}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#fd7e14' }]} />
              <Text style={styles.legendText}>Em andamento: {casosStatus[1]}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#dc3545' }]} />
              <Text style={styles.legendText}>Fechado: {casosStatus[2]}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Gráfico de Casos por Dia */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="bar-chart" size={20} color="white" />
          <Text style={styles.chartHeaderText}>Casos Registrados por Dia</Text>
        </View>
        <View style={styles.chartContainer}>
          <LineChart
            data={lineChartData}
            width={screenWidth}
            height={220}
            chartConfig={{
              ...chartConfig,
              propsForLabels: {
                fontSize: 10,
                fontWeight: '500',
                rotation: -35,
                textAnchor: 'end'
              }
            }}
            fromZero
            bezier
            withVerticalLines={false}
            withHorizontalLines={false}
            segments={4}
            style={{
              marginVertical: 20,
              borderRadius: 16,
              marginLeft: -20
            }}
            verticalLabelRotation={-45}
            xLabelsOffset={-10}
            yAxisLabel=""
            yAxisSuffix=""
            formatXLabel={(value) => value.length > 8 ? `${value.substring(0, 8)}...` : value}
          />
        </View>
      </View>

      {/* Gráfico de Usuários por Tipo */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="people" size={20} color="white" />
          <Text style={styles.chartHeaderText}>Distribuição de Usuários</Text>
        </View>
        <View style={styles.chartContainer}>
          <BarChart
            data={{
              labels: ['Assistentes', 'Peritos', 'Admins'],
              datasets: [{ 
                data: usuariosTipo,
                colors: [
                  (opacity = 1) => `rgba(13, 202, 240, ${opacity})`,
                  (opacity = 1) => `rgba(25, 135, 84, ${opacity})`,
                  (opacity = 1) => `rgba(111, 66, 193, ${opacity})`
                ]
              }]
            }}
            width={screenWidth}
            height={220}
            chartConfig={{
              ...chartConfig,
              barPercentage: 0.5,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              fillShadowGradient: '#153777',
              fillShadowGradientOpacity: 0.3,
              propsForLabels: {
                fontSize: 12,
                fontWeight: '500'
              }
            }}
            fromZero
            showValuesOnTopOfBars
            withHorizontalLabels={false}
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
            verticalLabelRotation={0}
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>
      </View>

      {/* Mapa de Casos */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="map" size={20} color="white" />
          <Text style={styles.chartHeaderText}>Mapa dos Locais dos Casos</Text>
        </View>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
          >
            {markers.map(marker => (
              <Marker
                key={marker.id}
                coordinate={{
                  latitude: marker.latitude,
                  longitude: marker.longitude
                }}
                title={marker.title}
                description={marker.description}
              />
            ))}
          </MapView>
        </View>
      </View>
    </ScrollView>
  );
}

// Configuração do Tab Navigator
export default function DashboardScreen() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Dashboard') {
              iconName = focused ? 'grid' : 'grid-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            } else if (route.name === 'Casos') {
              iconName = focused ? 'folder' : 'folder-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            } else if (route.name === 'Evidências') {
              iconName = focused ? 'search' : 'search-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            } else if (route.name === 'Relatório') {
              return <MaterialIcons name="description" size={size} color={color} />;
            } else if (route.name === 'Cadastrar') {
              return <Feather name="plus-square" size={size} color={color} />;
            }
          },
          tabBarActiveTintColor: '#3624d6',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            height: 60,
            paddingBottom: 5,
            paddingTop: 5,
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardContent} 
          options={{ headerShown: false }} 
        />
        <Tab.Screen 
          name="Casos" 
          component={CasosScreen} 
          options={{ headerShown: false }} 
        />
        <Tab.Screen 
          name="Evidências" 
          component={EvidenciasScreen} 
          options={{ headerShown: false }} 
        />
         <Tab.Screen 
          name="Relatório" 
          component={RelatorioScreen} 
          options={{ headerShown: false }} 
        />
        <Tab.Screen 
          name="Cadastrar" 
          component={CadastroScreen} 
          options={{ headerShown: false }} 
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(21, 55, 119, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#153777' },
  barPercentage: 0.5,
  propsForLabels: {
    fontSize: 10,
    fontWeight: '500'
  },
  fillShadowGradient: '#153777',
  fillShadowGradientOpacity: 0.3
};

const styles = StyleSheet.create({
  container: { 
    padding: 16,
    paddingBottom: 80,
    backgroundColor: '#f8f9fa'
  },
  title: { 
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#153777'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    marginTop: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    marginTop: 16,
    color: '#153777',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8
  },
  dateInputContainer: {
    flex: 1,
    marginRight: 8
  },
  dateLabel: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
    fontWeight: '500'
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    height: 48
  },
  dateInputText: {
    fontSize: 14,
    color: '#495057'
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#153777',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 48
  },
  filterButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  summaryCard: {
    width: '30%',
    backgroundColor: 'white',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  summaryCardContent: {
    padding: 12,
    alignItems: 'center'
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center'
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  chartHeader: {
    backgroundColor: '#153777',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  chartHeaderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  chartContainer: {
    padding: 16
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4
  },
  legendText: {
    fontSize: 12,
    color: '#495057'
  },
  mapContainer: {
    height: 300,
    width: '100%'
  },
  map: {
    flex: 1
  }
});
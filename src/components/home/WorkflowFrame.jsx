import React from 'react'
import { Section, Div, Title, Card, CardText, CardTitle } from '../../shared';
import Childoneworkflow from "./Childoneworkflow";
import Track from './Track';

function Workflow() {
  return (
    <Section>
        <Div>
            <div>
                <Title>Designed to optimise your workflow</Title>

                <div className="mt-16 grid grid-cols-1 gap-8">
                    <Childoneworkflow/>
                    <Track/>
                </div>
            </div>
        </Div>
    </Section>
  )
}

export default Workflow;

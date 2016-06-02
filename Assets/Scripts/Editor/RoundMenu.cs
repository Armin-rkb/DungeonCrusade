using UnityEngine;
using UnityEditor;
using System.Collections;

[CustomEditor(typeof(RoundsSetUp))]
public class RoundMenu : Editor
{

    public override void OnInspectorGUI()
    {
        RoundsSetUp saveLoadResource = (RoundsSetUp)target;
        DrawDefaultInspector();

        GUILayout.BeginHorizontal();
        GUILayout.Label("Round: ");
        GUILayout.Label(saveLoadResource.BestOf.ToString());
        GUILayout.EndHorizontal();


        GUILayout.BeginHorizontal();
        if (GUILayout.Button("Save Resources"))
        {
            saveLoadResource.SaveResource();
        }

        if (GUILayout.Button("Load Resources"))
        {
            saveLoadResource.LoadResource();
            Repaint();
        }

        GUILayout.EndHorizontal();
    }
}

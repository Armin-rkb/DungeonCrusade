using UnityEngine;
using System.Collections;

public class PlayerCollision : MonoBehaviour
{
    [HideInInspector] public Collider2D[] _ignoredColl;
    
	void Awake ()
    {
        _ignoredColl = gameObject.GetComponentsInChildren<Collider2D>();
    }
}

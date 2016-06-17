using UnityEngine;
using System.Collections;

public class SeagullMovement : MonoBehaviour {

    [SerializeField]
    private float _movementSpeed;

    [SerializeField]
    private Rigidbody2D _thisRigidBody2D;

    void Update()
    {
        _thisRigidBody2D.velocity = new Vector2(_movementSpeed, 0);
    }
}

using UnityEngine;
using System.Collections;

public class DuckExplosion : MonoBehaviour
{
    //Amout of damage that the bullet will deal
    [SerializeField] private int damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;

    void Start()
    {
        InvokeRepeating("ExplosionSound", 0, 0.25f);
    }

    void ExplosionSound()
    {
        SoundManager.PlayAudioClip(AudioData.DuckExplosion);
    }

    void Hit(GameObject player)
    {
        //Give the player knockback
        PlayerMovement playerMovement = player.GetComponent<PlayerMovement>();
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        Vector2 currPosition = (transform.position - rbPlayer.transform.position).normalized;
        playerMovement.ApplyKnockback(currPosition * knockback);
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(1, true);
    }

    void OnParticleCollision(GameObject other)
    {
        if (other != null)
        {
            if (other.CompareTag(GameTags.player))
                Hit(other);
        }
    }
}
